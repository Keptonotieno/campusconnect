import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import type { Request } from 'express';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads_private');
const MASTER_KEY_FILE = path.join(DATA_DIR, '.master.key');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o700 });
}

let cachedMasterKey: Buffer | null = null;
let cachedSigningKey: Buffer | null = null;

export function getMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;

  const envKey = (process.env.APP_ENCRYPTION_KEY || '').trim();
  if (envKey.length >= 16) {
    cachedMasterKey = crypto.createHash('sha256').update(`campusconnect:enc:v1:${envKey}`).digest();
    return cachedMasterKey;
  }

  try {
    if (fs.existsSync(MASTER_KEY_FILE)) {
      try {
        fs.chmodSync(MASTER_KEY_FILE, 0o600);
      } catch {
        // Ignore on filesystems that disallow chmod
      }
      const hex = fs.readFileSync(MASTER_KEY_FILE, 'utf8').trim();
      if (/^[a-f0-9]{64}$/i.test(hex)) {
        cachedMasterKey = Buffer.from(hex, 'hex');
        return cachedMasterKey;
      }
    }
    const generated = crypto.randomBytes(32);
    fs.writeFileSync(MASTER_KEY_FILE, generated.toString('hex'), { mode: 0o600, encoding: 'utf8' });
    try {
      fs.chmodSync(MASTER_KEY_FILE, 0o600);
    } catch {
      // Ignore on filesystems that disallow chmod
    }
    cachedMasterKey = generated;
    return cachedMasterKey;
  } catch {
    // Ephemeral fallback if filesystem is strictly read-only
    cachedMasterKey = crypto.randomBytes(32);
    return cachedMasterKey;
  }
}

export function getSigningKey(): Buffer {
  if (cachedSigningKey) return cachedSigningKey;
  const envSession = (process.env.SESSION_SECRET || '').trim();
  if (envSession.length >= 16) {
    cachedSigningKey = crypto.createHash('sha256').update(`campusconnect:hmac:v1:${envSession}`).digest();
    return cachedSigningKey;
  }
  cachedSigningKey = crypto.createHmac('sha256', getMasterKey()).update('campusconnect-hmac-subkey').digest();
  return cachedSigningKey;
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

// -----------------------------------------------------------------------------
// PASSWORD HASHING & CONSTANT-TIME VERIFICATION
// -----------------------------------------------------------------------------
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPasswordScrypt(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS).toString('hex');
  return {
    hash: `scrypt$${salt}$${derived}`,
    salt
  };
}

export function verifyPasswordConstantTime(
  password: string,
  storedHash: string,
  storedSalt?: string
): { valid: boolean; needsUpgrade: boolean } {
  if (typeof password !== 'string' || !password || !storedHash) {
    return { valid: false, needsUpgrade: false };
  }

  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return { valid: false, needsUpgrade: false };
    const [, salt, hexHash] = parts;
    if (!salt || !hexHash) return { valid: false, needsUpgrade: false };
    try {
      const expected = Buffer.from(hexHash, 'hex');
      const actual = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS);
      if (expected.length !== actual.length) return { valid: false, needsUpgrade: false };
      return {
        valid: crypto.timingSafeEqual(expected, actual),
        needsUpgrade: false
      };
    } catch {
      return { valid: false, needsUpgrade: false };
    }
  }

  // Legacy PBKDF2 exact match only (no case-folding or character variations)
  if (!storedSalt) return { valid: false, needsUpgrade: false };
  try {
    const expected = Buffer.from(storedHash, 'hex');
    const actual = crypto.pbkdf2Sync(password, storedSalt, 10000, 64, 'sha512');
    if (expected.length !== actual.length) return { valid: false, needsUpgrade: false };
    const valid = crypto.timingSafeEqual(expected, actual);
    return { valid, needsUpgrade: valid };
  } catch {
    return { valid: false, needsUpgrade: false };
  }
}

export function dummyPasswordCheck(password: string): void {
  try {
    crypto.scryptSync(password || 'dummy', '00000000000000000000000000000000', 64, SCRYPT_PARAMS);
  } catch {
    // ignore
  }
}

const COMPROMISED_PASSWORDS = new Set([
  'password123',
  'password1234',
  '1234567890',
  'qwerty12345',
  'admin123456',
  'campusconnect',
  'campusconnect123',
  'kepton@12romez',
  'letmein12345',
  'welcome12345'
]);

export function validatePasswordStrength(
  password: string,
  isAdmin = false
): { valid: boolean; message?: string } {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password must be a text string.' };
  }
  const minLen = isAdmin ? 12 : 10;
  if (password.length < minLen) {
    return { valid: false, message: `Password must be at least ${minLen} characters long.` };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password cannot exceed 128 characters.' };
  }
  if (COMPROMISED_PASSWORDS.has(password.trim().toLowerCase())) {
    return { valid: false, message: 'That password is on a blocked/compromised list. Please choose a unique passphrase.' };
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must include uppercase, lowercase, a number, and a special character.'
    };
  }
  return { valid: true };
}

// -----------------------------------------------------------------------------
// AEAD AES-256-GCM SECRET ENCRYPTION AT REST
// -----------------------------------------------------------------------------
const ENC_PREFIX = 'enc:v1:';

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  if (plaintext.startsWith(ENC_PREFIX)) return plaintext;
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(stored: string): string {
  if (!stored) return '';
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  try {
    const body = stored.slice(ENC_PREFIX.length);
    const [ivHex, tagHex, encHex] = body.split(':');
    if (!ivHex || !tagHex || !encHex) return '';
    const key = getMasterKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

// -----------------------------------------------------------------------------
// HASHING, TOKENS & SIGNED URLS
// -----------------------------------------------------------------------------
export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hmacSha256Hex(payload: string, secret?: string | Buffer): string {
  const key = secret ?? getSigningKey();
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function signFileAccessToken(fileId: string, ttlSeconds = 300): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = hmacSha256Hex(`file:${fileId}:${exp}`);
  return { exp, sig };
}

export function verifyFileAccessToken(fileId: string, expStr: string, sigStr: string): boolean {
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  if (!sigStr || !/^[a-f0-9]{64}$/i.test(sigStr)) return false;
  const expected = hmacSha256Hex(`file:${fileId}:${exp}`);
  return timingSafeEqualStr(expected, sigStr.toLowerCase());
}

// -----------------------------------------------------------------------------
// RFC-6238 TOTP MFA & BACKUP CODES
// -----------------------------------------------------------------------------
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function buildOtpAuthUri(email: string, secretBase32: string, issuer = 'CampusConnect Admin'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const iss = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`;
}

export function generateTotpCodeForStep(secretBase32: string, step: number): string {
  const key = base32Decode(secretBase32);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step), 0);
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(
  secretBase32: string,
  submittedCode: string,
  window = 1
): { valid: boolean; step: number | null } {
  const clean = (submittedCode || '').replace(/\s+/g, '').trim();
  if (!/^\d{6}$/.test(clean) || !secretBase32) {
    return { valid: false, step: null };
  }
  const currentStep = Math.floor(Date.now() / 30000);
  for (let offset = -window; offset <= window; offset++) {
    const step = currentStep + offset;
    const expected = generateTotpCodeForStep(secretBase32, step);
    if (timingSafeEqualStr(clean, expected)) {
      return { valid: true, step };
    }
  }
  return { valid: false, step: null };
}

export function generateBackupCodes(count = 8): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
    plain.push(formatted);
    hashes.push(sha256Hex(formatted));
  }
  return { plain, hashes };
}

// -----------------------------------------------------------------------------
// SSRF, XSS & INPUT SANITIZATION
// -----------------------------------------------------------------------------
function isPrivateOrDisallowedIp(ip: string): boolean {
  const clean = ip.replace(/^::ffff:/i, '').toLowerCase();
  if (clean === '::1' || clean === '::' || clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe80')) {
    return true;
  }
  if (!net.isIPv4(clean)) return net.isIPv6(clean); // disallow non-loopback raw IPv6 literals for simplicity
  const parts = clean.split('.').map(Number);
  if (parts.length !== 4) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // Cloud metadata / link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // Multicast / reserved
  return false;
}

export function validateSafeHttpUrl(
  rawUrl: string,
  options: { allowHttp?: boolean; allowRelative?: boolean } = {}
): { valid: boolean; normalized?: string; reason?: string } {
  if (typeof rawUrl !== 'string') return { valid: false, reason: 'URL must be a string.' };
  const trimmed = rawUrl.trim();
  if (!trimmed) return { valid: false, reason: 'URL cannot be empty.' };
  if (options.allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { valid: true, normalized: trimmed };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }

  const allowedProtocols = options.allowHttp ? new Set(['https:', 'http:']) : new Set(['https:']);
  if (!allowedProtocols.has(parsed.protocol)) {
    return { valid: false, reason: `Protocol "${parsed.protocol}" is not permitted.` };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Embedded credentials in URLs are not permitted.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return { valid: false, reason: 'Internal or loopback hostnames are not permitted.' };
  }

  if (net.isIP(host) && isPrivateOrDisallowedIp(host)) {
    return { valid: false, reason: 'Private or link-local IP addresses are not permitted.' };
  }

  return { valid: true, normalized: parsed.toString() };
}

export function escapeHtml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHexColor(val: unknown, fallback = '#1D64EC'): string {
  const str = String(val ?? '').trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(str) ? str : fallback;
}

export function isTrustedProxyIp(ipRaw: string): boolean {
  const ip = (ipRaw || '').replace(/^::ffff:/, '').trim();
  if (!net.isIP(ip)) return false;

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 127) return true; // Loopback 127.0.0.0/8
    if (parts[0] === 10) return true; // RFC1918 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // RFC1918 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // RFC1918 192.168.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true; // Link-local 169.254.0.0/16
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT 100.64.0.0/10
    return false;
  }

  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower.startsWith('fe80:') ||
    lower.startsWith('fc') ||
    lower.startsWith('fd')
  );
}

export function getNormalizedClientIp(req: Request): string {
  const remoteRaw = (req.socket?.remoteAddress || '127.0.0.1').replace(/^::ffff:/, '').trim();
  const remoteIp = net.isIP(remoteRaw) ? remoteRaw : '127.0.0.1';

  const trustDisabled = process.env.TRUST_PROXY === 'false';
  const trustProxy = !trustDisabled && (process.env.TRUST_PROXY === 'true' || isTrustedProxyIp(remoteIp));

  if (trustProxy) {
    const xffHeader = req.headers['x-forwarded-for'];
    if (xffHeader) {
      const chain = (Array.isArray(xffHeader) ? xffHeader.join(',') : String(xffHeader))
        .split(',')
        .map(part => part.trim().replace(/^::ffff:/, ''))
        .filter(candidate => Boolean(net.isIP(candidate)));

      // Walk right-to-left to pick the rightmost non-proxy public IP (prevents left-side XFF spoofing)
      for (let i = chain.length - 1; i >= 0; i--) {
        if (!isTrustedProxyIp(chain[i])) {
          return chain[i];
        }
      }
      if (chain.length > 0) {
        return chain[0];
      }
    }

    const cfIp = String(req.headers['cf-connecting-ip'] || '').trim().replace(/^::ffff:/, '');
    if (cfIp && net.isIP(cfIp)) return cfIp;

    const realIp = String(req.headers['x-real-ip'] || '').trim().replace(/^::ffff:/, '');
    if (realIp && net.isIP(realIp)) return realIp;
  }

  return remoteIp;
}

// -----------------------------------------------------------------------------
// SECURE IMAGE UPLOAD VALIDATION & PRIVATE STORAGE
// -----------------------------------------------------------------------------
export interface StoredUploadMetadata {
  fileId: string;
  ext: 'jpg' | 'png' | 'webp';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  sha256: string;
  absolutePath: string;
}

export function validateAndStoreImageUpload(
  dataUrl: string,
  maxBytes = 8 * 1024 * 1024
): StoredUploadMetadata {
  if (typeof dataUrl !== 'string' || !dataUrl.trim()) {
    throw new Error('Image payload is required.');
  }

  const match = dataUrl.trim().match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('Only base64 JPEG, PNG, and WebP images are permitted. SVG, HTML, and executable formats are blocked.');
  }

  const declaredMime = match[1].toLowerCase();
  const base64Body = match[2];

  // Reject oversized base64 before decoding
  const estimatedBytes = Math.ceil((base64Body.length * 3) / 4);
  if (estimatedBytes > maxBytes + 1024) {
    throw new Error(`Image exceeds maximum allowed size (${Math.round(maxBytes / (1024 * 1024))} MB).`);
  }

  const buf = Buffer.from(base64Body, 'base64');
  if (buf.length < 16 || buf.length > maxBytes) {
    throw new Error(`Image size (${buf.length} bytes) is outside permitted limits.`);
  }

  // Magic-byte signature verification
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
  const isWebp =
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP';

  let ext: 'jpg' | 'png' | 'webp';
  let mimeType: 'image/jpeg' | 'image/png' | 'image/webp';

  if (isJpeg && (declaredMime === 'image/jpeg' || declaredMime === 'image/jpg')) {
    ext = 'jpg';
    mimeType = 'image/jpeg';
  } else if (isPng && declaredMime === 'image/png') {
    ext = 'png';
    mimeType = 'image/png';
  } else if (isWebp && declaredMime === 'image/webp') {
    ext = 'webp';
    mimeType = 'image/webp';
  } else {
    throw new Error('Image binary signature does not match declared JPEG/PNG/WebP format.');
  }

  // Polyglot / embedded script guard on leading header bytes & full buffer scan for SVG/HTML tags
  const asciiScan = buf.toString('latin1').toLowerCase();
  if (
    asciiScan.includes('<script') ||
    asciiScan.includes('<svg') ||
    asciiScan.includes('<?php') ||
    asciiScan.includes('<!doctype html') ||
    asciiScan.includes('<html')
  ) {
    throw new Error('Suspicious embedded markup detected in image file.');
  }

  const fileId = `img_${crypto.randomUUID().replace(/-/g, '')}`;
  const filename = `${fileId}.${ext}`;
  const targetPath = path.resolve(UPLOADS_DIR, filename);
  if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Invalid storage target path.');
  }

  fs.writeFileSync(targetPath, buf, { mode: 0o600 });

  return {
    fileId,
    ext,
    mimeType,
    sizeBytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    absolutePath: targetPath
  };
}

export function resolvePrivateUploadPath(fileId: string, ext: string): string {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(fileId) || !/^(jpg|png|webp)$/.test(ext)) {
    throw new Error('Invalid file identifier.');
  }
  const targetPath = path.resolve(UPLOADS_DIR, `${fileId}.${ext}`);
  if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Path traversal blocked.');
  }
  return targetPath;
}
