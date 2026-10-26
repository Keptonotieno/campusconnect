/**
 * Cloudflare Workers / Pages Advanced Handler
 * Resolves 405 Method Not Allowed on Cloudflare Workers (e.g. keptonotieno.workers.dev)
 * Handles CORS preflights and administrative authentication directly in the edge worker.
 */

const MASTER_ADMIN_EMAILS = [
  'campusconnect@gmail.com',
  'compusconnect@gmail.com',
  'keptonotieno@gmail.com',
  'admin@campusconnect.app'
];

function isMasterPassword(pass) {
  const trimmed = (pass || '').trim();
  if (trimmed === 'kepton@12Romez' || trimmed === 'Kepton@12Romez') return true;
  if (trimmed.toLowerCase() === 'kepton@12romez') return true;
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight for mobile & cross-origin requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Pragma, Cache-Control, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Handle /api/auth/admin-login (Resolves HTTP 405 Method Not Allowed on workers.dev)
    if (url.pathname === '/api/auth/admin-login' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const email = (body.email || '').trim().toLowerCase();
        const pass = (body.password || '').trim();

        const isValidEmail = MASTER_ADMIN_EMAILS.includes(email) || email.startsWith('admin@');
        const isValidPass = isMasterPassword(pass);

        if (isValidEmail && isValidPass) {
          const sessionToken = 'cf_adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
          const adminUser = {
            id: 'admin_' + email.replace(/[^a-z0-9]/g, '_'),
            email: email,
            role: 'Admin',
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
          };

          return new Response(JSON.stringify({
            success: true,
            message: 'Administrator authenticated successfully.',
            admin: adminUser,
            token: sessionToken,
            expiresAt: adminUser.expiresAt
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Set-Cookie': `admin_session_token=${sessionToken}; Path=/; Max-Age=14400; SameSite=Lax; Secure`
            }
          });
        }

        return new Response(JSON.stringify({
          error: 'AuthenticationFailed',
          message: 'Invalid administrator credentials. Please check your email and master password.'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'AuthError', message: err.message }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // 3. Handle /api/auth/admin-status
    if (url.pathname === '/api/auth/admin-status') {
      return new Response(JSON.stringify({ bootstrapped: true, adminCount: 4 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 4. Default Static Asset Serving via env.ASSETS (Cloudflare Workers Static Assets)
    if (env && env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        // SPA Fallback: if asset not found and not an API call, serve index.html for client-side routing
        if (response.status === 404 && !url.pathname.startsWith('/api/')) {
          const indexRequest = new Request(new URL('/', request.url), request);
          return await env.ASSETS.fetch(indexRequest);
        }
        return response;
      } catch {
        // Continue to default
      }
    }

    return fetch(request);
  }
};
