function callCloud(name, data) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errMsg = (res.result && res.result.error) || '请求失败'
          wx.showToast({ title: errMsg, icon: 'none' })
          reject(new Error(errMsg))
        }
      },
      fail: err => {
        wx.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      }
    })
  })
}

// User APIs
const userApi = {
  login: () => callCloud('user', { action: 'login' }),
  getProfile: () => callCloud('user', { action: 'getProfile' }),
  updateNickname: (nickname) => callCloud('user', { action: 'updateNickname', nickname }),
  createGuild: (guildName) => callCloud('user', { action: 'createGuild', guildName }),
  joinGuild: (inviteCode, nickname) => callCloud('user', { action: 'joinGuild', inviteCode, nickname }),
  setRole: (targetUserId, role) => callCloud('user', { action: 'setRole', targetUserId, role }),
  listMembers: () => callCloud('user', { action: 'listMembers' }),
  removeMember: (targetUserId) => callCloud('user', { action: 'removeMember', targetUserId })
}

// Task APIs
const taskApi = {
  publish: (data) => callCloud('task', { action: 'publish', ...data }),
  list: () => callCloud('task', { action: 'list' }),
  submit: (taskId, screenshotFileId) => callCloud('task', { action: 'submit', taskId, screenshotFileId }),
  mySubmissions: (taskId) => callCloud('task', { action: 'mySubmissions', taskId }),
  cancel: (taskId) => callCloud('task', { action: 'cancel', taskId })
}

// Review APIs
const reviewApi = {
  pendingList: () => callCloud('review', { action: 'pendingList' }),
  approve: (submissionId) => callCloud('review', { action: 'approve', submissionId }),
  reject: (submissionId, reason) => callCloud('review', { action: 'reject', submissionId, reason }),
  batchApprove: (submissionIds) => callCloud('review', { action: 'batchApprove', submissionIds })
}

// Shop APIs
const shopApi = {
  listRewards: () => callCloud('shop', { action: 'listRewards' }),
  addReward: (data) => callCloud('shop', { action: 'addReward', ...data }),
  updateReward: (data) => callCloud('shop', { action: 'updateReward', ...data }),
  exchange: (rewardId) => callCloud('shop', { action: 'exchange', rewardId }),
  myExchanges: () => callCloud('shop', { action: 'myExchanges' }),
  pendingExchanges: () => callCloud('shop', { action: 'pendingExchanges' }),
  fulfillExchange: (exchangeId) => callCloud('shop', { action: 'fulfillExchange', exchangeId })
}

module.exports = { userApi, taskApi, reviewApi, shopApi }
