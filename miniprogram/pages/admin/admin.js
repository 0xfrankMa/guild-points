const { reviewApi } = require('../../utils/api')

Page({
  data: {
    pendingCount: 0,
    isMaster: false
  },
  onShow() {
    const app = getApp()
    const user = app.globalData.userInfo
    this.setData({ isMaster: user && user.role === 'master' })
    this.loadPendingCount()
  },
  async loadPendingCount() {
    try {
      const res = await reviewApi.pendingList()
      this.setData({ pendingCount: (res.submissions || []).length })
    } catch (e) {}
  },
  goTo(e) {
    const page = e.currentTarget.dataset.page
    wx.navigateTo({ url: '/pages/admin/' + page + '/' + page })
  }
})