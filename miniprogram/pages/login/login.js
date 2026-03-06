const { userApi } = require('../../utils/api')

Page({
  data: {
    tab: 'join',
    inviteCode: '',
    nickname: '',
    guildName: '',
    avatarUrl: '',
    loading: false
  },
  onLoad(options) {
    if (options.inviteCode) {
      this.setData({ inviteCode: options.inviteCode, tab: 'join' })
    }
  },
  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },
  onInviteCodeInput(e) { this.setData({ inviteCode: e.detail.value }) },
  onNicknameInput(e) { this.setData({ nickname: e.detail.value }) },
  onGuildNameInput(e) { this.setData({ guildName: e.detail.value }) },
  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  async uploadAvatar() {
    if (!this.data.avatarUrl) return null
    try {
      const res = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath: 'avatars/' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.jpg',
          filePath: this.data.avatarUrl,
          success: r => resolve(r.fileID),
          fail: reject
        })
      })
      return res
    } catch (e) {
      console.error('avatar upload failed', e)
      return null
    }
  },

  async joinGuild() {
    if (!this.data.inviteCode || !this.data.nickname) {
      wx.showToast({ title: '请填写邀请码和昵称', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const avatarFileId = await this.uploadAvatar()
      await userApi.joinGuild(this.data.inviteCode, this.data.nickname, avatarFileId)
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
    if (!this.data.guildName || !this.data.nickname) {
      wx.showToast({ title: '请填写工会名称和昵称', icon: 'none' })
      return
    }
    this.setData({ loading: true })
    try {
      const avatarFileId = await this.uploadAvatar()
      const res = await userApi.createGuild(this.data.guildName, this.data.nickname, avatarFileId)
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
