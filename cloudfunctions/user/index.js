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
      return await createGuild(openid, event)
    case 'joinGuild':
      return await joinGuild(openid, event)
    case 'setRole':
      return await setRole(openid, event.targetUserId, event.role)
    case 'listMembers':
      return await listMembers(openid)
    case 'removeMember':
      return await removeMember(openid, event.targetUserId)
    case 'checkin':
      return await checkin(openid)
    case 'leaveGuild':
      return await leaveGuild(openid)
    case 'transferMaster':
      return await transferMaster(openid, event.targetUserId)
    case 'updateAvatar':
      return await updateAvatar(openid, event.avatarUrl)
    case 'getGuildSettings':
      return await getGuildSettings(openid)
    case 'updateCheckinSlogan':
      return await updateCheckinSlogan(openid, event.slogan)
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

async function createGuild(openid, event) {
  const { guildName, nickname, avatarUrl } = event
  if (!guildName || guildName.trim().length === 0) {
    return { success: false, error: '工会名称不能为空' }
  }
  if (!nickname || nickname.trim().length === 0) {
    return { success: false, error: '请输入游戏昵称' }
  }
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  const guildId = 'guild_' + Date.now()
  await db.collection('users').doc(openid).set({
    data: {
      nickname: nickname.trim(),
      role: 'master',
      guild_id: guildId,
      guild_name: guildName.trim(),
      invite_code: inviteCode,
      avatar_url: avatarUrl || '',
      points: 0,
      total_earned: 0,
      total_spent: 0,
      created_at: db.serverDate()
    }
  })
  return { success: true, guildId, inviteCode }
}

async function joinGuild(openid, event) {
  const { inviteCode, nickname, avatarUrl } = event
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
      nickname: nickname.trim(),
      role: 'member',
      guild_id: master.guild_id,
      avatar_url: avatarUrl || '',
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

async function checkin(openid) {
  const user = await db.collection('users').doc(openid).get()
  if (!user.data) {
    return { success: false, error: '用户不存在' }
  }
  const today = new Date().toISOString().slice(0, 10)
  if (user.data.last_checkin === today) {
    return { success: false, error: '今天已经膜拜过了，明天再来吧' }
  }
  const streak = (user.data.last_checkin === getYesterday()) ? (user.data.checkin_streak || 0) + 1 : 1
  await db.collection('users').doc(openid).update({
    data: {
      last_checkin: today,
      checkin_streak: streak,
      points: _.inc(1),
      total_earned: _.inc(1)
    }
  })
  return { success: true, streak, points: 1 }
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function leaveGuild(openid) {
  const user = await db.collection('users').doc(openid).get()
  if (!user.data || !user.data.guild_id) {
    return { success: false, error: '你不在任何工会中' }
  }

  if (user.data.role === 'master') {
    const members = await db.collection('users').where({
      guild_id: user.data.guild_id
    }).count()

    if (members.total > 1) {
      return { success: false, error: '请先将会长移交给其他成员后再退出' }
    }
    // Only member is master, dissolve guild
    await db.collection('users').doc(openid).remove()
    return { success: true, dissolved: true }
  }

  // Regular member or admin, just leave
  await db.collection('users').doc(openid).remove()
  return { success: true, dissolved: false }
}

async function transferMaster(openid, targetUserId) {
  const caller = await db.collection('users').doc(openid).get()
  if (caller.data.role !== 'master') {
    return { success: false, error: '只有会长可以移交会长' }
  }
  if (targetUserId === openid) {
    return { success: false, error: '不能移交给自己' }
  }
  const target = await db.collection('users').doc(targetUserId).get()
  if (!target.data || target.data.guild_id !== caller.data.guild_id) {
    return { success: false, error: '该用户不在你的工会中' }
  }

  // Transfer: target becomes master with invite_code and guild_name
  await db.collection('users').doc(targetUserId).update({
    data: {
      role: 'master',
      invite_code: caller.data.invite_code,
      guild_name: caller.data.guild_name
    }
  })
  // Caller becomes admin
  await db.collection('users').doc(openid).update({
    data: {
      role: 'admin',
      invite_code: _.remove(),
      guild_name: _.remove()
    }
  })
  return { success: true }
}

async function updateAvatar(openid, avatarUrl) {
  if (!avatarUrl) {
    return { success: false, error: '头像不能为空' }
  }
  await db.collection('users').doc(openid).update({
    data: { avatar_url: avatarUrl }
  })
  return { success: true }
}

async function getGuildSettings(openid) {
  const user = await db.collection('users').doc(openid).get()
  if (!user.data || !user.data.guild_id) {
    return { success: false, error: '不在工会中' }
  }
  const masterRes = await db.collection('users').where({
    guild_id: user.data.guild_id,
    role: 'master'
  }).get()
  const master = masterRes.data[0]
  return {
    success: true,
    checkin_slogan: (master && master.checkin_slogan) || '膜拜嫂子看黑山'
  }
}

async function updateCheckinSlogan(openid, slogan) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '只有会长或管理员可以修改' }
  }
  if (!slogan || slogan.trim().length === 0) {
    return { success: false, error: '词条不能为空' }
  }
  // Store on master's document
  const masterRes = await db.collection('users').where({
    guild_id: caller.data.guild_id,
    role: 'master'
  }).get()
  if (masterRes.data.length === 0) {
    return { success: false, error: '找不到会长' }
  }
  await db.collection('users').doc(masterRes.data[0]._id).update({
    data: { checkin_slogan: slogan.trim() }
  })
  return { success: true }
}
