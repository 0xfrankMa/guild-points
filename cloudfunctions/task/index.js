const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'publish':
      return await publishTask(openid, event)
    case 'list':
      return await listTasks(openid)
    case 'submit':
      return await submitTask(openid, event)
    case 'mySubmissions':
      return await mySubmissions(openid, event.taskId)
    case 'cancel':
      return await cancelTask(openid, event.taskId)
    default:
      return { success: false, error: 'Unknown action' }
  }
}

async function publishTask(openid, event) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限发布任务' }
  }
  const { title, description, points, verifyType, daily, maxCompletions, expireAt } = event
  if (!title || !points || points <= 0) {
    return { success: false, error: '任务标题和积分不能为空' }
  }
  const res = await db.collection('tasks').add({
    data: {
      guild_id: caller.data.guild_id,
      title: title.trim(),
      description: (description || '').trim(),
      points: Number(points),
      verify_type: verifyType || 'self_check',
      daily: daily || false,
      max_completions: maxCompletions || 1,
      expire_at: expireAt ? new Date(expireAt) : null,
      created_by: openid,
      status: 'active',
      created_at: db.serverDate()
    }
  })
  return { success: true, taskId: res._id }
}

async function listTasks(openid) {
  const caller = await db.collection('users').doc(openid).get()
  const tasksRes = await db.collection('tasks').where({
    guild_id: caller.data.guild_id,
    status: 'active'
  }).orderBy('created_at', 'desc').limit(50).get()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const subsRes = await db.collection('submissions').where({
    user_id: openid,
    created_at: _.gte(todayStart)
  }).get()

  const submissionMap = {}
  subsRes.data.forEach(sub => {
    if (!submissionMap[sub.task_id]) {
      submissionMap[sub.task_id] = { count: 0, statuses: [] }
    }
    submissionMap[sub.task_id].count++
    submissionMap[sub.task_id].statuses.push(sub.status)
  })

  const tasks = tasksRes.data.map(task => {
    const sub = submissionMap[task._id] || { count: 0, statuses: [] }
    return {
      ...task,
      my_submissions_today: sub.count,
      my_statuses: sub.statuses,
      can_submit: sub.count < task.max_completions
    }
  })

  return { success: true, tasks }
}

async function submitTask(openid, event) {
  const { taskId, screenshotFileId } = event
  const task = await db.collection('tasks').doc(taskId).get()
  if (!task.data || task.data.status !== 'active') {
    return { success: false, error: '任务不存在或已过期' }
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todaySubs = await db.collection('submissions').where({
    task_id: taskId,
    user_id: openid,
    created_at: _.gte(todayStart)
  }).count()
  if (todaySubs.total >= task.data.max_completions) {
    return { success: false, error: '今天已达到最大完成次数' }
  }

  if (task.data.verify_type === 'screenshot' && !screenshotFileId) {
    return { success: false, error: '该任务需要上传截图' }
  }

  const isSelfCheck = task.data.verify_type === 'self_check'
  const status = isSelfCheck ? 'approved' : 'pending'

  const res = await db.collection('submissions').add({
    data: {
      task_id: taskId,
      user_id: openid,
      screenshot_id: screenshotFileId || null,
      status,
      reviewed_by: isSelfCheck ? 'system' : null,
      reject_reason: null,
      created_at: db.serverDate()
    }
  })

  if (isSelfCheck) {
    await db.collection('users').doc(openid).update({
      data: {
        points: _.inc(task.data.points),
        total_earned: _.inc(task.data.points)
      }
    })
  }

  return { success: true, submissionId: res._id, status }
}

async function mySubmissions(openid, taskId) {
  const where = { user_id: openid }
  if (taskId) where.task_id = taskId
  const res = await db.collection('submissions').where(where)
    .orderBy('created_at', 'desc').limit(50).get()
  return { success: true, submissions: res.data }
}

async function cancelTask(openid, taskId) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限' }
  }
  await db.collection('tasks').doc(taskId).update({
    data: { status: 'cancelled' }
  })
  return { success: true }
}
