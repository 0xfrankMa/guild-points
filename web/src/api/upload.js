import { requireAuth } from '../auth.js';

export async function handleUploadRoutes(request, env, path, method) {
  // POST /api/upload - upload file to R2
  if (method === 'POST' && path === '/api/upload') {
    const authResult = await requireAuth(request, env);
    if (authResult instanceof Response) return authResult;

    const filename = request.headers.get('X-Filename') || 'file';
    const random = Math.random().toString(36).substring(2, 10);
    const key = 'uploads/' + Date.now() + '_' + random + '_' + filename;

    await env.R2.put(key, request.body, {
      httpMetadata: {
        contentType: request.headers.get('Content-Type') || 'image/jpeg',
      },
    });

    return new Response(JSON.stringify({ success: true, url: '/api/file/' + key }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // GET /api/file/* - serve file from R2
  if (method === 'GET' && path.startsWith('/api/file/')) {
    const key = path.slice('/api/file/'.length);
    if (!key) {
      return new Response(JSON.stringify({ error: 'Missing file key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const obj = await env.R2.get(key);
    if (!obj) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
      },
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
