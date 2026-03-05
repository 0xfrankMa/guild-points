const { userApi } = require('../../../utils/api')

Page({
  data: { members: [] },
  onShow() { this.loadData() },
  async loadData() {
    const res = await userApi.listMembers()
    this.setData({ members: res.members || [] })
  },
  async toggleAdmin(e) {
    const { id, role } = e.currentTarget.dataset
    const newRole = role === 'admin' ? 'member' : 'admin'
    await userApi.setRole(id, newRole)
    wx.showToast({ title: '已更新' })
    this.loadData()
  },
  removeMember(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '确认移除',
      content: '确定移除成员「' + name + '」吗？',
      success: async (res) => {
        if (res.confirm) {
          await userApi.removeMember(id)
          wx.showToast({ title: '已移除' })
          this.loadData()
        }
      }
    })
  }
})