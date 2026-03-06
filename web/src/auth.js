export async function getUser(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const user = await env.DB.prepare('SELECT * FROM users WHERE token = ?').bind(token).first()
  return user || null
}

export async function requireUser(request, env) {
  const user = await getUser(request, env)
  if (!user) {
    return { error: jsonResponse({ error: '未登录' }, 401) }
  }
  return { user }
}

export async function requireAdmin(request, env) {
  const result = await requireUser(request, env)
  if (result.error) return result
  if (result.user.role !== 'master' && result.user.role !== 'admin') {
    return { error: jsonResponse({ error: '无权限' }, 403) }
  }
  return result
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
