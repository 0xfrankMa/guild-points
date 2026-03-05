const { userApi } = require('../../utils/api')
const { roleLabel, isAdmin } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    roleLabel: '',
    rankings: [],
    inviteCode: ''
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    const profileRes = await userApi.getProfile()
    const userInfo = profileRes.user
    this.setData({
      userInfo,
      roleLabel: roleLabel(userInfo.role)
    })

    if (isAdmin(userInfo.role)) {
      const membersRes = await userApi.listMembers()
      const sorted = (membersRes.members || [])
        .sort((a, b) => b.total_earned - a.total_earned)
        .slice(0, 20)
      this.setData({ rankings: sorted })

      if (userInfo.role === 'master' && userInfo.invite_code) {
        this.setData({ inviteCode: userInfo.invite_code })
      }
    }
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '已复制' })
    })
  }
})
