const { userApi } = require('../../utils/api')

Page({
  data: {
    tab: 'join',
    inviteCode: '',
    nickname: '',
    guildName: '',
    loading: false
  },
  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },
  onInviteCodeInput(e) { this.setData({ inviteCode: e.detail.value }) },
  onNicknameInput(e) { this.setData({ nickname: e.detail.value }) },
  onGuildNameInput(e) { this.setData({ guildName: e.detail.value }) },

  async joinGuild() {
    if (!this.data.inviteCode || !this.data.nickname) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      await userApi.joinGuild(this.data.inviteCode, this.data.nickname)
      wx.showToast({ title: '加入成功!' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/index/index' })
      }, 1000)
    } catch (e) {
      console.error(e)
    }
    this.setData({ loading: false })
  },

  async createGuild() {
    if (!this.data.guildName) {
      wx.showToast({ title: '请输入工会名称', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const res = await userApi.createGuild(this.data.guildName)
      wx.showModal({
        title: '工会创建成功!',
        content: '邀请码: ' + res.inviteCode + '\n请将邀请码分享给工会成员',
        showCancel: false,
        success: () => {
          wx.reLaunch({ url: '/pages/index/index' })
        }
      })
    } catch (e) {
      console.error(e)
    }
    this.setData({ loading: false })
  }
})
