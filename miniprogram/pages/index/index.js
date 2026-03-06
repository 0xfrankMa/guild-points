const { userApi, taskApi } = require('../../utils/api')
const { isAdmin } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    tasks: [],
    isAdmin: false,
    loading: true
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  async loadData() {
    this.setData({ loading: true })
    try {
      const app = getApp()
      const profileRes = await userApi.getProfile().catch(() => null)
      if (!profileRes || !profileRes.user) {
        wx.redirectTo({ url: '/pages/login/login' })
        return
      }
      const userInfo = profileRes.user
      app.globalData.userInfo = userInfo
      this.setData({
        userInfo,
        isAdmin: isAdmin(userInfo.role)
      })

      const taskRes = await taskApi.list()
      this.setData({ tasks: taskRes.tasks || [] })
    } catch (e) {
      console.error(e)
    }
    this.setData({ loading: false })
  },

  goToTaskDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/task-detail/task-detail?id=' + id })
  },

  goToShop() {
    wx.navigateTo({ url: '/pages/shop/shop' })
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' })
  },

  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  },

  onShareAppMessage() {
    const user = this.data.userInfo
    return {
      title: '加入工会一起做任务赚积分！',
      path: '/pages/index/index'
    }
  }
})
