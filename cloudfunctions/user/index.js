const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'login':
      return await login(openid)
    case 'getProfile':
      return await getProfile(openid)
    case 'updateNickname':
      return await updateNickname(openid, event.nickname)
    case 'createGuild':
      return await createGuild(openid, event.guildName)
    case 'joinGuild':
      return await joinGuild(openid, event.inviteCode, event.nickname)
    case 'setRole':
      return await setRole(openid, event.targetUserId, event.role)
    case 'listMembers':
      return await listMembers(openid)
    case 'removeMember':
      return await removeMember(openid, event.targetUserId)
    default:
      return { success: false, error: 'Unknown action' }
  }
}

async function login(openid) {
  const userRes = await db.collection('users').doc(openid).get().catch(() => null)
  if (userRes && userRes.data) {
    return { success: true, user: userRes.data, isNew: false }
  }
  return { success: true, user: null, isNew: true }
}

async function getProfile(openid) {
  const userRes = await db.collection('users').doc(openid).get().catch(() => null)
  if (!userRes || !userRes.data) {
    return { success: false, error: '用户不存在' }
  }
  return { success: true, user: userRes.data }
}

async function updateNickname(openid, nickname) {
  if (!nickname || nickname.trim().length === 0) {
    return { success: false, error: '昵称不能为空' }
  }
  await db.collection('users').doc(openid).update({
    data: { nickname: nickname.trim() }
  })
  return { success: true }
}

async function createGuild(openid, guildName) {
  if (!guildName || guildName.trim().length === 0) {
    return { success: false, error: '工会名称不能为空' }
  }
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  const guildId = 'guild_' + Date.now()
  await db.collection('users').doc(openid).set({
    data: {
      _id: openid,
      nickname: guildName + '会长',
      role: 'master',
      guild_id: guildId,
      guild_name: guildName,
      invite_code: inviteCode,
      points: 0,
      total_earned: 0,
      total_spent: 0,
      created_at: db.serverDate()
    }
  })
  return { success: true, guildId, inviteCode }
}

async function joinGuild(openid, inviteCode, nickname) {
  if (!inviteCode || !nickname) {
    return { success: false, error: '邀请码和昵称不能为空' }
  }
  const masterRes = await db.collection('users').where({
    invite_code: inviteCode.toUpperCase(),
    role: 'master'
  }).get()
  if (masterRes.data.length === 0) {
    return { success: false, error: '邀请码无效' }
  }
  const master = masterRes.data[0]
  const existing = await db.collection('users').doc(openid).get().catch(() => null)
  if (existing && existing.data && existing.data.guild_id) {
    return { success: false, error: '你已经加入了工会' }
  }
  await db.collection('users').doc(openid).set({
    data: {
      _id: openid,
      nickname: nickname.trim(),
      role: 'member',
      guild_id: master.guild_id,
      points: 0,
      total_earned: 0,
      total_spent: 0,
      created_at: db.serverDate()
    }
  })
  return { success: true, guildId: master.guild_id }
}

async function setRole(openid, targetUserId, role) {
  const caller = await db.collection('users').doc(openid).get()
  if (caller.data.role !== 'master') {
    return { success: false, error: '只有会长可以设置角色' }
  }
  if (!['admin', 'member'].includes(role)) {
    return { success: false, error: '无效角色' }
  }
  if (targetUserId === openid) {
    return { success: false, error: '不能修改自己的角色' }
  }
  await db.collection('users').doc(targetUserId).update({
    data: { role }
  })
  return { success: true }
}

async function listMembers(openid) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限' }
  }
  const res = await db.collection('users').where({
    guild_id: caller.data.guild_id
  }).orderBy('role', 'asc').orderBy('total_earned', 'desc').get()
  return { success: true, members: res.data }
}

async function removeMember(openid, targetUserId) {
  const caller = await db.collection('users').doc(openid).get()
  if (caller.data.role !== 'master') {
    return { success: false, error: '只有会长可以移除成员' }
  }
  if (targetUserId === openid) {
    return { success: false, error: '不能移除自己' }
  }
  await db.collection('users').doc(targetUserId).remove()
  return { success: true }
}
