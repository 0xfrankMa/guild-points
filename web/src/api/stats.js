import { requireAdmin, jsonResponse } from '../auth.js'
import { todayStr } from '../db.js'

export async function handleStatsRoutes(request, env, path, method) {
  if (path === '/api/stats' && method === 'GET') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error

    const guildId = result.user.guild_id
    const today = todayStr()

    // Date helpers
    const d7 = new Date(); d7.setDate(d7.getDate() - 7)
    const day7 = d7.toISOString().slice(0, 10)
    const d30 = new Date(); d30.setDate(d30.getDate() - 30)
    const day30 = d30.toISOString().slice(0, 10)

    // Total members
    const totalMembers = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM users WHERE guild_id = ?'
    ).bind(guildId).first()

    // Today's checkins
    const todayCheckins = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM users WHERE guild_id = ? AND last_checkin = ?'
    ).bind(guildId, today).first()

    // Today's submissions
    const todaySubs = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM submissions s
       JOIN tasks t ON s.task_id = t.id
       WHERE t.guild_id = ? AND substr(s.created_at, 1, 10) = ?`
    ).bind(guildId, today).first()

    // Pending reviews
    const pendingReviews = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM submissions s
       JOIN tasks t ON s.task_id = t.id
       WHERE t.guild_id = ? AND s.status = 'pending'`
    ).bind(guildId).first()

    // Total points distributed
    const totalPoints = await env.DB.prepare(
      'SELECT SUM(total_earned) as total FROM users WHERE guild_id = ?'
    ).bind(guildId).first()

    // Active tasks count
    const activeTasks = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM tasks WHERE guild_id = ? AND status = 'active'"
    ).bind(guildId).first()

    // 7-day submission trend (per day)
    const { results: dailySubs } = await env.DB.prepare(
      `SELECT substr(s.created_at, 1, 10) as date, COUNT(*) as cnt
       FROM submissions s JOIN tasks t ON s.task_id = t.id
       WHERE t.guild_id = ? AND substr(s.created_at, 1, 10) >= ?
       GROUP BY date ORDER BY date`
    ).bind(guildId, day7).all()

    // 7-day checkin trend (per day)
    const { results: dailyCheckins } = await env.DB.prepare(
      `SELECT last_checkin as date, COUNT(*) as cnt
       FROM users WHERE guild_id = ? AND last_checkin >= ?
       GROUP BY last_checkin ORDER BY last_checkin`
    ).bind(guildId, day7).all()

    // Member activity: each member's recent stats
    const { results: members } = await env.DB.prepare(
      'SELECT id, nickname, role, points, total_earned, last_checkin, checkin_streak, created_at FROM users WHERE guild_id = ? ORDER BY total_earned DESC'
    ).bind(guildId).all()

    // Count submissions per member in last 7 days
    const { results: memberSubs7d } = await env.DB.prepare(
      `SELECT s.user_id, COUNT(*) as cnt
       FROM submissions s JOIN tasks t ON s.task_id = t.id
       WHERE t.guild_id = ? AND substr(s.created_at, 1, 10) >= ?
       GROUP BY s.user_id`
    ).bind(guildId, day7).all()

    const subsMap = {}
    for (const ms of memberSubs7d) {
      subsMap[ms.user_id] = ms.cnt
    }

    const memberStats = members.map(m => ({
      id: m.id,
      nickname: m.nickname,
      role: m.role,
      points: m.points,
      total_earned: m.total_earned,
      checkin_streak: m.checkin_streak,
      last_checkin: m.last_checkin,
      checked_in_today: m.last_checkin === today,
      submissions_7d: subsMap[m.id] || 0,
      days_joined: Math.max(1, Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000))
    }))

    // Task completion stats
    const { results: taskStats } = await env.DB.prepare(
      `SELECT t.id, t.title, t.points,
        (SELECT COUNT(*) FROM submissions WHERE task_id = t.id AND status = 'approved') as approved_count,
        (SELECT COUNT(*) FROM submissions WHERE task_id = t.id AND status = 'pending') as pending_count,
        (SELECT COUNT(DISTINCT user_id) FROM submissions WHERE task_id = t.id AND status = 'approved') as unique_completers
       FROM tasks t WHERE t.guild_id = ? AND t.status = 'active'
       ORDER BY approved_count DESC`
    ).bind(guildId).all()

    return jsonResponse({
      overview: {
        total_members: totalMembers.cnt,
        today_checkins: todayCheckins.cnt,
        today_submissions: todaySubs.cnt,
        pending_reviews: pendingReviews.cnt,
        total_points_distributed: totalPoints.total || 0,
        active_tasks: activeTasks.cnt
      },
      daily_submissions: dailySubs,
      daily_checkins: dailyCheckins,
      member_stats: memberStats,
      task_stats: taskStats
    })
  }

  return null
}
