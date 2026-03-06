const { userApi } = require('../../utils/api')
const { roleLabel, isAdmin } = require('../../utils/util')

Page({
  data: {
    userInfo: null,
    roleLabel: '',
    rankings: [],
    inviteCode: '',
    guildName: '',
    checkedIn: false,
    checkinStreak: 0,
    checkinSlogan: '膜拜嫂子看黑山',
    isAdmin: false,
    editingNickname: false,
    newNickname: ''
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    const profileRes = await userApi.getProfile()
    const userInfo = profileRes.user
    const today = new Date().toISOString().slice(0, 10)
    this.setData({
      userInfo,
      roleLabel: roleLabel(userInfo.role),
      isAdmin: isAdmin(userInfo.role),
      checkedIn: userInfo.last_checkin === today,
      checkinStreak: userInfo.checkin_streak || 0
    })

    // Load guild checkin slogan
    try {
      const settings = await userApi.getGuildSettings()
      if (settings.checkin_slogan) {
        this.setData({ checkinSlogan: settings.checkin_slogan })
      }
    } catch (e) { /* use default */ }

    if (isAdmin(userInfo.role)) {
      const membersRes = await userApi.listMembers()
      const sorted = (membersRes.members || [])
        .sort((a, b) => b.total_earned - a.total_earned)
        .slice(0, 20)
      this.setData({ rankings: sorted })
    }

    // All members can see invite code (fetched from guild master)
    if (userInfo.invite_code) {
      this.setData({ inviteCode: userInfo.invite_code, guildName: userInfo.guild_name || '工会' })
    } else {
      // Non-master: fetch invite code from master
      try {
        const membersRes = this.data.rankings.length > 0
          ? { members: this.data.rankings }
          : await userApi.listMembers().catch(() => null)
        if (membersRes && membersRes.members) {
          const master = membersRes.members.find(m => m.role === 'master')
          if (master && master.invite_code) {
            this.setData({ inviteCode: master.invite_code, guildName: master.guild_name || '工会' })
          }
        }
      } catch (e) { /* ignore */ }
    }
  },

  editSlogan() {
    wx.showModal({
      title: '修改膜拜词条',
      editable: true,
      placeholderText: '输入新的膜拜词条',
      content: this.data.checkinSlogan,
      success: async (res) => {
        if (!res.confirm || !res.content || !res.content.trim()) return
        try {
          await userApi.updateCheckinSlogan(res.content.trim())
          this.setData({ checkinSlogan: res.content.trim() })
          wx.showToast({ title: '修改成功' })
        } catch (e) {
          console.error(e)
        }
      }
    })
  },

  async doCheckin() {
    if (this.data.checkedIn) {
      wx.showToast({ title: '今天已经膜拜过了', icon: 'none' })
      return
    }
    try {
      const res = await userApi.checkin()
      this.setData({ checkedIn: true, checkinStreak: res.streak })
      wx.showModal({
        title: '🙏 膜拜成功',
        content: '嫂子看黑山已收到你的膜拜！\n积分 +1，连续膜拜 ' + res.streak + ' 天',
        showCancel: false,
        confirmText: '好的',
        confirmColor: '#F5A623'
      })
      this.loadData()
    } catch (e) {
      console.error(e)
    }
  },

  startEditNickname() {
    this.setData({ editingNickname: true, newNickname: this.data.userInfo.nickname })
  },
  onNicknameInput(e) {
    this.setData({ newNickname: e.detail.value })
  },
  async saveNickname() {
    const name = this.data.newNickname.trim()
    if (!name) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    try {
      await userApi.updateNickname(name)
      this.setData({ editingNickname: false })
      wx.showToast({ title: '修改成功' })
      this.loadData()
    } catch (e) {
      console.error(e)
    }
  },

  leaveGuild() {
    const isMaster = this.data.userInfo.role === 'master'
    wx.showModal({
      title: '确认退出工会？',
      content: isMaster ? '你是会长，如果工会只有你一人，退出将解散工会。如果有其他成员，请先移交会长。' : '退出后积分将清零，确定要退出吗？',
      confirmColor: '#E74C3C',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await userApi.leaveGuild()
          const msg = result.dissolved ? '工会已解散' : '已退出工会'
          wx.showToast({ title: msg })
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' })
          }, 1000)
        } catch (e) {
          console.error(e)
        }
      }
    })
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '已复制' })
    })
  },

  onShareAppMessage() {
    return {
      title: '加入「' + this.data.guildName + '」一起做任务赚积分！',
      path: '/pages/login/login?inviteCode=' + this.data.inviteCode
    }
  }
})
