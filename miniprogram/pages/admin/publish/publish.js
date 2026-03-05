const { taskApi } = require('../../../utils/api')

Page({
  data: {
    title: '',
    description: '',
    points: '',
    verifyType: 'self_check',
    maxCompletions: '1',
    daily: true,
    loading: false
  },
  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },
  setVerifyType(e) {
    this.setData({ verifyType: e.currentTarget.dataset.type })
  },
  toggleDaily(e) {
    this.setData({ daily: e.detail.value })
  },
  async publish() {
    if (!this.data.title || !this.data.points) {
      wx.showToast({ title: '请填写标题和积分', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      await taskApi.publish({
        title: this.data.title,
        description: this.data.description,
        points: this.data.points,
        verifyType: this.data.verifyType,
        maxCompletions: parseInt(this.data.maxCompletions) || 1,
        daily: this.data.daily
      })
      wx.showToast({ title: '发布成功!' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      console.error(e)
    }
    this.setData({ loading: false })
  }
})