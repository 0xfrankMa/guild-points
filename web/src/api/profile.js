import { requireUser, requireAdmin, jsonResponse } from '../auth.js'
import { todayStr, yesterdayStr } from '../db.js'

export async function handleProfileRoutes(request, env, path, method) {
  // GET /api/profile
  if (path === '/api/profile' && method === 'GET') {
    const result = await requireUser(request, env)
    if (result.error) return result.error
    const { user } = result

    const guild = await env.DB.prepare('SELECT name, invite_code FROM guilds WHERE id = ?').bind(user.guild_id).first()
    const guild_name = guild ? guild.name : null
    const invite_code = guild ? guild.invite_code : null

    const { token, ...userFields } = user
    return jsonResponse({ user: { ...userFields, guild_name, invite_code } })
  }

  // PUT /api/profile/nickname
  if (path === '/api/profile/nickname' && method === 'PUT') {
    const result = await requireUser(request, env)
    if (result.error) return result.error
    const { user } = result

    const body = await request.json()
    const { nickname } = body
    if (!nickname) return jsonResponse({ error: '昵称不能为空' }, 400)

    await env.DB.prepare('UPDATE users SET nickname = ? WHERE id = ?').bind(nickname, user.id).run()
    return jsonResponse({ success: true })
  }

  // POST /api/checkin
  if (path === '/api/checkin' && method === 'POST') {
    const result = await requireUser(request, env)
    if (result.error) return result.error
    const { user } = result

    const today = todayStr()
    if (user.last_checkin === today) {
      return jsonResponse({ error: '今天已经膜拜过了' }, 400)
    }

    const yesterday = yesterdayStr()
    const streak = user.last_checkin === yesterday ? (user.checkin_streak || 0) + 1 : 1

    await env.DB.prepare(
      'UPDATE users SET last_checkin = ?, checkin_streak = ?, points = points + 1, total_earned = total_earned + 1 WHERE id = ?'
    ).bind(today, streak, user.id).run()

    return jsonResponse({ success: true, streak, points: 1 })
  }

  // GET /api/members
  if (path === '/api/members' && method === 'GET') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error
    const { user } = result

    const { results: members } = await env.DB.prepare(
      'SELECT id, nickname, role, points, total_earned, last_checkin, checkin_streak, created_at FROM users WHERE guild_id = ? ORDER BY role ASC, total_earned DESC'
    ).bind(user.guild_id).all()

    return jsonResponse({ members })
  }

  // PUT /api/members/:id/role
  if (method === 'PUT' && path.startsWith('/api/members/') && path.endsWith('/role')) {
    const parts = path.split('/')
    const targetId = parts[3]

    const result = await requireUser(request, env)
    if (result.error) return result.error
    const { user } = result

    if (user.role !== 'master') {
      return jsonResponse({ error: '无权限' }, 403)
    }
    if (targetId === user.id) {
      return jsonResponse({ error: '不能修改自己的角色' }, 400)
    }

    const body = await request.json()
    const { role } = body
    if (role !== 'admin' && role !== 'member') {
      return jsonResponse({ error: '无效的角色' }, 400)
    }

    await env.DB.prepare('UPDATE users SET role = ? WHERE id = ? AND guild_id = ?').bind(role, targetId, user.guild_id).run()
    return jsonResponse({ success: true })
  }

  // DELETE /api/members/:id
  if (method === 'DELETE' && path.startsWith('/api/members/') && path.split('/').length === 4) {
    const parts = path.split('/')
    const targetId = parts[3]

    const result = await requireUser(request, env)
    if (result.error) return result.error
    const { user } = result

    if (user.role !== 'master') {
      return jsonResponse({ error: '无权限' }, 403)
    }
    if (targetId === user.id) {
      return jsonResponse({ error: '不能删除自己' }, 400)
    }

    await env.DB.prepare('DELETE FROM users WHERE id = ? AND guild_id = ?').bind(targetId, user.guild_id).run()
    return jsonResponse({ success: true })
  }

  return null
}
