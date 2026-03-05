App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloudbase-7gkgm64j5535ea47',
      traceUser: true
    })
    this.checkLogin()
  },
  globalData: {
    userInfo: null
  },
  async checkLogin() {
    try {
      const res = await wx.cloud.callFunction({ name: 'user', data: { action: 'login' } })
      if (res.result.success && !res.result.isNew && res.result.user) {
        this.globalData.userInfo = res.result.user
      }
    } catch (e) {
      console.error('login check failed', e)
    }
  }
})
