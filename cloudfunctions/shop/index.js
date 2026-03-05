const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  switch (action) {
    case 'listRewards':
      return await listRewards(openid)
    case 'addReward':
      return await addReward(openid, event)
    case 'updateReward':
      return await updateReward(openid, event)
    case 'exchange':
      return await exchange(openid, event.rewardId)
    case 'myExchanges':
      return await myExchanges(openid)
    case 'pendingExchanges':
      return await pendingExchanges(openid)
    case 'fulfillExchange':
      return await fulfillExchange(openid, event.exchangeId)
    default:
      return { success: false, error: 'Unknown action' }
  }
}

async function listRewards(openid) {
  const caller = await db.collection('users').doc(openid).get()
  const res = await db.collection('rewards').where({
    guild_id: caller.data.guild_id,
    status: _.in(['active', 'sold_out'])
  }).orderBy('cost', 'asc').get()
  return { success: true, rewards: res.data, myPoints: caller.data.points }
}

async function addReward(openid, event) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限' }
  }
  const { name, type, cost, stock } = event
  if (!name || !cost || cost <= 0) {
    return { success: false, error: '商品名和积分不能为空' }
  }
  const res = await db.collection('rewards').add({
    data: {
      guild_id: caller.data.guild_id,
      name: name.trim(),
      type: type || 'game_item',
      cost: Number(cost),
      stock: stock != null ? Number(stock) : -1,
      status: 'active',
      created_at: db.serverDate()
    }
  })
  return { success: true, rewardId: res._id }
}

async function updateReward(openid, event) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限' }
  }
  const { rewardId, name, cost, stock, status } = event
  const updateData = {}
  if (name != null) updateData.name = name.trim()
  if (cost != null) updateData.cost = Number(cost)
  if (stock != null) updateData.stock = Number(stock)
  if (status != null) updateData.status = status
  await db.collection('rewards').doc(rewardId).update({ data: updateData })
  return { success: true }
}

async function exchange(openid, rewardId) {
  const reward = await db.collection('rewards').doc(rewardId).get()
  if (!reward.data || reward.data.status !== 'active') {
    return { success: false, error: '商品不存在或已下架' }
  }
  const user = await db.collection('users').doc(openid).get()
  if (user.data.points < reward.data.cost) {
    return { success: false, error: '积分不足' }
  }
  if (reward.data.stock === 0) {
    return { success: false, error: '库存不足' }
  }

  await db.collection('users').doc(openid).update({
    data: {
      points: _.inc(-reward.data.cost),
      total_spent: _.inc(reward.data.cost)
    }
  })

  if (reward.data.stock > 0) {
    const newStock = reward.data.stock - 1
    await db.collection('rewards').doc(rewardId).update({
      data: {
        stock: _.inc(-1),
        status: newStock === 0 ? 'sold_out' : 'active'
      }
    })
  }

  const res = await db.collection('exchanges').add({
    data: {
      user_id: openid,
      reward_id: rewardId,
      reward_name: reward.data.name,
      cost: reward.data.cost,
      status: 'pending',
      fulfilled_by: null,
      created_at: db.serverDate()
    }
  })

  return { success: true, exchangeId: res._id }
}

async function myExchanges(openid) {
  const res = await db.collection('exchanges').where({
    user_id: openid
  }).orderBy('created_at', 'desc').limit(50).get()
  return { success: true, exchanges: res.data }
}

async function pendingExchanges(openid) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限' }
  }
  const membersRes = await db.collection('users').where({
    guild_id: caller.data.guild_id
  }).field({ _id: true, nickname: true }).get()
  const memberMap = {}
  membersRes.data.forEach(m => { memberMap[m._id] = m.nickname })
  const memberIds = Object.keys(memberMap)

  const res = await db.collection('exchanges').where({
    user_id: _.in(memberIds),
    status: 'pending'
  }).orderBy('created_at', 'asc').get()

  const exchanges = res.data.map(ex => ({
    ...ex,
    user_nickname: memberMap[ex.user_id] || '未知用户'
  }))

  return { success: true, exchanges }
}

async function fulfillExchange(openid, exchangeId) {
  const caller = await db.collection('users').doc(openid).get()
  if (!['master', 'admin'].includes(caller.data.role)) {
    return { success: false, error: '无权限' }
  }
  await db.collection('exchanges').doc(exchangeId).update({
    data: {
      status: 'fulfilled',
      fulfilled_by: openid
    }
  })
  return { success: true }
}
