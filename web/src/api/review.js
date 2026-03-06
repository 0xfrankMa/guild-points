import { requireAdmin, jsonResponse } from '../auth.js'

export async function handleReviewRoutes(request, env, path, method) {
  if (path === '/api/review' && method === 'GET') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error

    const submissions = await env.DB.prepare(
      `SELECT s.*, u.nickname as user_nickname, t.title as task_title, t.points as task_points
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       JOIN tasks t ON s.task_id = t.id
       WHERE s.status = 'pending' AND t.guild_id = ?`
    ).bind(result.user.guild_id).all()

    return jsonResponse({ submissions: submissions.results })
  }

  if (path.match(/^\/api\/review\/[^/]+\/approve$/) && method === 'POST') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error

    const id = path.split('/')[3]

    const submission = await env.DB.prepare(
      'SELECT * FROM submissions WHERE id = ?'
    ).bind(id).first()

    if (!submission) {
      return jsonResponse({ error: '提交不存在' }, 404)
    }

    if (submission.status !== 'pending') {
      return jsonResponse({ error: '该提交已被审核' }, 400)
    }

    await env.DB.prepare(
      "UPDATE submissions SET status = 'approved', reviewed_by = ? WHERE id = ?"
    ).bind(result.user.id, id).run()

    const task = await env.DB.prepare(
      'SELECT points FROM tasks WHERE id = ?'
    ).bind(submission.task_id).first()

    await env.DB.prepare(
      'UPDATE users SET points = points + ?, total_earned = total_earned + ? WHERE id = ?'
    ).bind(task.points, task.points, submission.user_id).run()

    return jsonResponse({ success: true })
  }

  if (path.match(/^\/api\/review\/[^/]+\/reject$/) && method === 'POST') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error

    const id = path.split('/')[3]
    const body = await request.json()
    const { reason } = body

    const submission = await env.DB.prepare(
      'SELECT * FROM submissions WHERE id = ?'
    ).bind(id).first()

    if (!submission) {
      return jsonResponse({ error: '提交不存在' }, 404)
    }

    if (submission.status !== 'pending') {
      return jsonResponse({ error: '该提交已被审核' }, 400)
    }

    await env.DB.prepare(
      "UPDATE submissions SET status = 'rejected', reviewed_by = ?, reject_reason = ? WHERE id = ?"
    ).bind(result.user.id, reason, id).run()

    return jsonResponse({ success: true })
  }

  if (path === '/api/review/batch-approve' && method === 'POST') {
    const result = await requireAdmin(request, env)
    if (result.error) return result.error

    const body = await request.json()
    const { ids } = body
    let count = 0

    for (const id of ids) {
      const submission = await env.DB.prepare(
        'SELECT * FROM submissions WHERE id = ?'
      ).bind(id).first()

      if (!submission || submission.status !== 'pending') continue

      await env.DB.prepare(
        "UPDATE submissions SET status = 'approved', reviewed_by = ? WHERE id = ?"
      ).bind(result.user.id, id).run()

      const task = await env.DB.prepare(
        'SELECT points FROM tasks WHERE id = ?'
      ).bind(submission.task_id).first()

      await env.DB.prepare(
        'UPDATE users SET points = points + ?, total_earned = total_earned + ? WHERE id = ?'
      ).bind(task.points, task.points, submission.user_id).run()

      count++
    }

    return jsonResponse({ success: true, count })
  }

  return null
}
