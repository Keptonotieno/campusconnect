// Cloudflare Worker / Pages Edge Middleware
// Hardened fail-closed edge gateway: adds HTTP security headers, enforces backend origin/fail-closed 503 on /api/* when no upstream backend is configured, and serves static assets safely.

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
};

function withSecurityHeaders(response, extraHeaders = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function jsonError(error, message, status = 503) {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // Reject TRACE / TRACK methods
    if (method === 'TRACE' || method === 'TRACK') {
      return jsonError('MethodNotAllowed', 'HTTP method not allowed.', 405);
    }

    // If an upstream Node/Express backend origin is configured via Worker env, proxy /api/* strictly to it
    if (pathname.startsWith('/api/')) {
      const upstreamOrigin = env && typeof env.API_ORIGIN === 'string' ? env.API_ORIGIN.trim().replace(/\/$/, '') : '';
      if (upstreamOrigin && upstreamOrigin.startsWith('https://')) {
        const targetUrl = `${upstreamOrigin}${pathname}${url.search}`;
        const proxyReq = new Request(targetUrl, request);
        const upstreamRes = await fetch(proxyReq);
        return withSecurityHeaders(upstreamRes, { 'Cache-Control': 'no-store' });
      }

      // Fail closed: Never forge auth, admin sessions, payments, or webhook approvals at the edge
      return jsonError(
        'BackendRequired',
        'API endpoints require the CampusConnect authenticated Node/Express backend server (API_ORIGIN not configured on static edge worker).',
        503
      );
    }

    // Serve static frontend assets via Cloudflare Pages ASSETS binding
    if (env && typeof env.ASSETS?.fetch === 'function') {
      const assetRes = await env.ASSETS.fetch(request);
      return withSecurityHeaders(assetRes);
    }

    return jsonError('NotFound', 'Static asset handler unavailable.', 404);
  }
};
