import { requireUser, requireAdmin, jsonResponse } from '../auth.js'
import { generateId, todayStr } from '../db.js'

export async function handleTaskRoutes(request, env, path, method) {
  // GET /api/tasks - list active tasks for user's guild
  if (path === '/api/tasks' && method === 'GET') {
    const result = await requireUser(request, env)
    if (result.error) return result.error

    const user = result.user
    const today = todayStr()

    const { results: tasks } = await env.DB.prepare(
      'SELECT * FROM tasks WHERE guild_id = ? AND status = ? ORDER BY created_at DESC'
    ).bind(user.guild_id, 'active').all()

    const enriched = []
    for (const task of tasks) {
      const { results: todaySubmissions } = await env.DB.prepare(
        `SELECT status FROM submissions WHERE task_id = ? AND user_id = ? AND substr(created_at, 1, 10) = ?`
      ).bind(task.id, user.id, today).all()

      const mySubmissionsToday = todaySubmissions.length
      const myStatuses = todaySubmissions.map(s => s.status)
      const canSubmit = mySubmissionsToday < task.max_completions

      enriched.push({
        ...task,
        my_submissions_today: mySubmissionsToday,
        can_submit: canSubmit,
        my_statuses: myStatuses
      })
    }

    return jsonResponse({ tasks: enriched })
  }

  // POST /api/tasks - create a new task (admin only)
  if (path === '/api/tasks' && method === 'POST') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error

    const body = await request.json()
    const { title, description, points, verifyType, daily, maxCompletions } = body

    if (!title || !points || points <= 0) {
      return jsonResponse({ error: '标题和积分为必填项且积分须大于0' }, 400)
    }

    const taskId = generateId()

    await env.DB.prepare(
      `INSERT INTO tasks (id, guild_id, title, description, points, verify_type, daily, max_completions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      taskId,
      result.user.guild_id,
      title,
      description || '',
      points,
      verifyType || 'self_check',
      daily ? 1 : 0,
      maxCompletions || 1
    ).run()

    return jsonResponse({ success: true, taskId })
  }

  // DELETE /api/tasks/:id - cancel a task (admin only)
  const deleteMatch = path.match(/^\/api\/tasks\/([^/]+)$/)
  if (deleteMatch && method === 'DELETE') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error

    const taskId = deleteMatch[1]

    await env.DB.prepare(
      'UPDATE tasks SET status = ? WHERE id = ?'
    ).bind('cancelled', taskId).run()

    return jsonResponse({ success: true })
  }

  // POST /api/tasks/:id/submit - submit a task completion
  const submitMatch = path.match(/^\/api\/tasks\/([^/]+)\/submit$/)
  if (submitMatch && method === 'POST') {
    const result = await requireUser(request, env)
    if (result.error) return result.error

    const user = result.user
    const taskId = submitMatch[1]
    const today = todayStr()

    const task = await env.DB.prepare(
      'SELECT * FROM tasks WHERE id = ?'
    ).bind(taskId).first()

    if (!task || task.status !== 'active') {
      return jsonResponse({ error: '任务不存在或已关闭' }, 404)
    }

    if (task.guild_id !== user.guild_id) {
      return jsonResponse({ error: '无权限' }, 403)
    }

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM submissions WHERE task_id = ? AND user_id = ? AND substr(created_at, 1, 10) = ?`
    ).bind(taskId, user.id, today).first()

    if (countResult.cnt >= task.max_completions) {
      return jsonResponse({ error: '今日提交次数已达上限' }, 400)
    }

    const body = await request.json()
    const { screenshotUrl } = body || {}

    if (task.verify_type === 'screenshot' && !screenshotUrl) {
      return jsonResponse({ error: '需要上传截图' }, 400)
    }

    const submissionId = generateId()
    let status

    if (task.verify_type === 'self_check') {
      status = 'approved'

      await env.DB.prepare(
        'UPDATE users SET points = points + ?, total_earned = total_earned + ? WHERE id = ?'
      ).bind(task.points, task.points, user.id).run()
    } else {
      status = 'pending'
    }

    await env.DB.prepare(
      `INSERT INTO submissions (id, task_id, user_id, screenshot_url, status)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(submissionId, taskId, user.id, screenshotUrl || null, status).run()

    return jsonResponse({ success: true, submissionId, status })
  }

  // GET /api/tasks/:id/submissions - list user's submissions for a task
  const submissionsMatch = path.match(/^\/api\/tasks\/([^/]+)\/submissions$/)
  if (submissionsMatch && method === 'GET') {
    const result = await requireUser(request, env)
    if (result.error) return result.error

    const taskId = submissionsMatch[1]

    const { results: submissions } = await env.DB.prepare(
      'SELECT * FROM submissions WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC'
    ).bind(taskId, result.user.id).all()

    return jsonResponse({ submissions })
  }

  return null
}
