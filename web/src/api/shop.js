import { requireUser, requireAdmin, jsonResponse } from '../auth.js'
import { generateId } from '../db.js'

export async function handleShopRoutes(request, env, path, method) {
  // GET /api/rewards
  if (path === '/api/rewards' && method === 'GET') {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const { results: rewards } = await env.DB.prepare(
      "SELECT * FROM rewards WHERE guild_id = ? AND status IN ('active','sold_out') ORDER BY cost ASC"
    ).bind(user.guild_id).all()

    return jsonResponse({ rewards, myPoints: user.points })
  }

  // POST /api/rewards
  if (path === '/api/rewards' && method === 'POST') {
    const { user, error } = await requireAdmin(request, env)
    if (error) return error

    const body = await request.json()
    const { name, type, cost, stock } = body

    if (!name || !cost || cost <= 0) {
      return jsonResponse({ error: '名称和积分不能为空且积分须大于0' }, 400)
    }

    const rewardId = generateId()
    const finalStock = stock == null || stock === '' ? -1 : stock

    await env.DB.prepare(
      'INSERT INTO rewards (id, guild_id, name, type, cost, stock) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(rewardId, user.guild_id, name, type || null, cost, finalStock).run()

    return jsonResponse({ success: true, rewardId })
  }

  // PUT /api/rewards/:id
  const putMatch = path.match(/^\/api\/rewards\/([^/]+)$/)
  if (putMatch && method === 'PUT') {
    const { user, error } = await requireAdmin(request, env)
    if (error) return error

    const rewardId = putMatch[1]
    const body = await request.json()
    const { status } = body

    await env.DB.prepare(
      'UPDATE rewards SET status = ? WHERE id = ? AND guild_id = ?'
    ).bind(status, rewardId, user.guild_id).run()

    return jsonResponse({ success: true })
  }

  // POST /api/rewards/:id/exchange
  const exchangeMatch = path.match(/^\/api\/rewards\/([^/]+)\/exchange$/)
  if (exchangeMatch && method === 'POST') {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const rewardId = exchangeMatch[1]

    const reward = await env.DB.prepare(
      'SELECT * FROM rewards WHERE id = ? AND guild_id = ?'
    ).bind(rewardId, user.guild_id).first()

    if (!reward || reward.status !== 'active') {
      return jsonResponse({ error: '奖励不存在或已下架' }, 400)
    }

    if (reward.stock === 0) {
      return jsonResponse({ error: '库存不足' }, 400)
    }

    if (user.points < reward.cost) {
      return jsonResponse({ error: '积分不足' }, 400)
    }

    // Deduct points
    await env.DB.prepare(
      'UPDATE users SET points = points - ?, total_spent = total_spent + ? WHERE id = ?'
    ).bind(reward.cost, reward.cost, user.id).run()

    // Decrement stock if not unlimited
    if (reward.stock > 0) {
      await env.DB.prepare(
        'UPDATE rewards SET stock = stock - 1 WHERE id = ?'
      ).bind(rewardId).run()
    }

    // Create exchange record
    const exchangeId = generateId()
    await env.DB.prepare(
      "INSERT INTO exchanges (id, user_id, reward_id, guild_id, cost, status) VALUES (?, ?, ?, ?, ?, 'pending')"
    ).bind(exchangeId, user.id, rewardId, user.guild_id, reward.cost).run()

    return jsonResponse({ success: true })
  }

  // GET /api/exchanges/mine
  if (path === '/api/exchanges/mine' && method === 'GET') {
    const { user, error } = await requireUser(request, env)
    if (error) return error

    const { results: exchanges } = await env.DB.prepare(
      'SELECT e.*, r.name AS reward_name FROM exchanges e LEFT JOIN rewards r ON e.reward_id = r.id WHERE e.user_id = ? ORDER BY e.created_at DESC'
    ).bind(user.id).all()

    return jsonResponse({ exchanges })
  }

  // GET /api/exchanges/pending
  if (path === '/api/exchanges/pending' && method === 'GET') {
    const { user, error } = await requireAdmin(request, env)
    if (error) return error

    const { results: exchanges } = await env.DB.prepare(
      "SELECT e.*, r.name AS reward_name, u.nickname FROM exchanges e LEFT JOIN rewards r ON e.reward_id = r.id LEFT JOIN users u ON e.user_id = u.id WHERE e.guild_id = ? AND e.status = 'pending' ORDER BY e.created_at DESC"
    ).bind(user.guild_id).all()

    return jsonResponse({ exchanges })
  }

  // POST /api/exchanges/:id/fulfill
  const fulfillMatch = path.match(/^\/api\/exchanges\/([^/]+)\/fulfill$/)
  if (fulfillMatch && method === 'POST') {
    const { user, error } = await requireAdmin(request, env)
    if (error) return error

    const exchangeId = fulfillMatch[1]

    await env.DB.prepare(
      "UPDATE exchanges SET status = 'fulfilled' WHERE id = ? AND guild_id = ?"
    ).bind(exchangeId, user.guild_id).run()

    return jsonResponse({ success: true })
  }

  return null
}
