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
        console.error('云函数调用失败:', name, err)
        wx.showToast({ title: err.errMsg || '网络错误', icon: 'none', duration: 3000 })
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
  createGuild: (guildName, nickname, avatarUrl) => callCloud('user', { action: 'createGuild', guildName, nickname, avatarUrl }),
  joinGuild: (inviteCode, nickname, avatarUrl) => callCloud('user', { action: 'joinGuild', inviteCode, nickname, avatarUrl }),
  setRole: (targetUserId, role) => callCloud('user', { action: 'setRole', targetUserId, role }),
  listMembers: () => callCloud('user', { action: 'listMembers' }),
  removeMember: (targetUserId) => callCloud('user', { action: 'removeMember', targetUserId }),
  checkin: () => callCloud('user', { action: 'checkin' }),
  leaveGuild: () => callCloud('user', { action: 'leaveGuild' }),
  transferMaster: (targetUserId) => callCloud('user', { action: 'transferMaster', targetUserId }),
  updateAvatar: (avatarUrl) => callCloud('user', { action: 'updateAvatar', avatarUrl }),
  getGuildSettings: () => callCloud('user', { action: 'getGuildSettings' }),
  updateCheckinSlogan: (slogan) => callCloud('user', { action: 'updateCheckinSlogan', slogan })
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
