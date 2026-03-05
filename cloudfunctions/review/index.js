const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'pendingList':
      return await pendingList(openid)
    case 'approve':
      return await reviewSubmission(openid, event.submissionId, 'approved')
    case 'reject':
      return await reviewSubmission(openid, event.submissionId, 'rejected', event.reason)
    case 'batchApprove':
      return await batchApprove(openid, event.submissionIds)
    default:
      return { success: false, error: 'Unknown action' }
  }
}

async function pendingList(openid) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限' }
  }
  const tasksRes = await db.collection('tasks').where({
    guild_id: caller.data.guild_id
  }).field({ _id: true, title: true, points: true }).get()

  const taskMap = {}
  tasksRes.data.forEach(t => { taskMap[t._id] = t })
  const taskIds = Object.keys(taskMap)

  if (taskIds.length === 0) {
    return { success: true, submissions: [] }
  }

  const subsRes = await db.collection('submissions').where({
    task_id: _.in(taskIds),
    status: 'pending'
  }).orderBy('created_at', 'asc').limit(50).get()

  const userIds = [...new Set(subsRes.data.map(s => s.user_id))]
  let userMap = {}
  if (userIds.length > 0) {
    const usersRes = await db.collection('users').where({
      _id: _.in(userIds)
    }).field({ _id: true, nickname: true }).get()
    usersRes.data.forEach(u => { userMap[u._id] = u })
  }

  const submissions = subsRes.data.map(sub => ({
    ...sub,
    task_title: taskMap[sub.task_id]?.title || '未知任务',
    task_points: taskMap[sub.task_id]?.points || 0,
    user_nickname: userMap[sub.user_id]?.nickname || '未知用户'
  }))

  return { success: true, submissions }
}

async function reviewSubmission(openid, submissionId, status, reason) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限' }
  }

  const sub = await db.collection('submissions').doc(submissionId).get()
  if (!sub.data || sub.data.status !== 'pending') {
    return { success: false, error: '提交记录不存在或已处理' }
  }

  await db.collection('submissions').doc(submissionId).update({
    data: {
      status,
      reviewed_by: openid,
      reject_reason: status === 'rejected' ? (reason || '未通过审核') : null
    }
  })

  if (status === 'approved') {
    const task = await db.collection('tasks').doc(sub.data.task_id).get()
    await db.collection('users').doc(sub.data.user_id).update({
      data: {
        points: _.inc(task.data.points),
        total_earned: _.inc(task.data.points)
      }
    })
  }

  return { success: true }
}

async function batchApprove(openid, submissionIds) {
  if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
    return { success: false, error: '请选择要通过的提交' }
  }
  const results = []
  for (const id of submissionIds) {
    const res = await reviewSubmission(openid, id, 'approved')
    results.push({ id, ...res })
  }
  return { success: true, results }
}
