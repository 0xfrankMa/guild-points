import { requireUser, requireAdmin, jsonResponse } from '../auth.js'
import { generateId, generateToken, generateInviteCode } from '../db.js'

export async function handleGuildRoutes(request, env, path, method) {
  if (path === '/api/guild/create' && method === 'POST') {
    const body = await request.json()
    const { name, nickname } = body

    const guildId = generateId()
    const inviteCode = generateInviteCode()
    const userId = generateId()
    const token = generateToken()

    await env.DB.prepare(
      'INSERT INTO guilds (id, name, invite_code) VALUES (?, ?, ?)'
    ).bind(guildId, name, inviteCode).run()

    await env.DB.prepare(
      'INSERT INTO users (id, guild_id, nickname, role, token) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, guildId, nickname, 'master', token).run()

    return jsonResponse({ token, inviteCode, guildName: name })
  }

  if (path === '/api/guild/join' && method === 'POST') {
    const body = await request.json()
    const { inviteCode, nickname } = body

    const guild = await env.DB.prepare(
      'SELECT * FROM guilds WHERE invite_code = ?'
    ).bind(inviteCode).first()

    if (!guild) {
      return jsonResponse({ error: '邀请码无效' }, 404)
    }

    const userId = generateId()
    const token = generateToken()

    await env.DB.prepare(
      'INSERT INTO users (id, guild_id, nickname, role, token) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, guild.id, nickname, 'member', token).run()

    return jsonResponse({ token })
  }

  if (path === '/api/guild/settings' && method === 'GET') {
    const result = await requireUser(request, env)
    if (result.error) return result.error

    const guild = await env.DB.prepare(
      'SELECT checkin_slogan FROM guilds WHERE id = ?'
    ).bind(result.user.guild_id).first()

    return jsonResponse({ checkin_slogan: guild?.checkin_slogan || '' })
  }

  if (path === '/api/guild/slogan' && method === 'PUT') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error

    const body = await request.json()
    const { slogan } = body

    await env.DB.prepare(
      'UPDATE guilds SET checkin_slogan = ? WHERE id = ?'
    ).bind(slogan, result.user.guild_id).run()

    return jsonResponse({ success: true })
  }

  if (path === '/api/guild/leave' && method === 'POST') {
    const result = await requireUser(request, env)
    if (result.error) return result.error

    const user = result.user

    if (user.role === 'master') {
      const count = await env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM users WHERE guild_id = ?'
      ).bind(user.guild_id).first()

      if (count.cnt > 1) {
        return jsonResponse({ error: '请先将会长移交给其他成员' }, 400)
      }

      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()
      await env.DB.prepare('DELETE FROM guilds WHERE id = ?').bind(user.guild_id).run()

      return jsonResponse({ success: true, dissolved: true })
    }

    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run()

    return jsonResponse({ success: true, dissolved: false })
  }

  if (path === '/api/guild/transfer' && method === 'POST') {
    const result = await requireUser(request, env)
    if (result.error) return result.error

    if (result.user.role !== 'master') {
      return jsonResponse({ error: '无权限' }, 403)
    }

    const body = await request.json()
    const { targetUserId } = body

    await env.DB.prepare(
      'UPDATE users SET role = ? WHERE id = ? AND guild_id = ?'
    ).bind('master', targetUserId, result.user.guild_id).run()

    await env.DB.prepare(
      'UPDATE users SET role = ? WHERE id = ?'
    ).bind('admin', result.user.id).run()

    return jsonResponse({ success: true })
  }

  return null
}
