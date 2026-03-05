const { reviewApi } = require('../../../utils/api')

Page({
  data: {
    submissions: [],
    selectedIds: [],
    selectedAll: false
  },
  onShow() { this.loadData() },
  async loadData() {
    const res = await reviewApi.pendingList()
    const submissions = (res.submissions || []).map(s => ({ ...s, selected: false }))
    this.setData({ submissions, selectedIds: [], selectedAll: false })
  },
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id
    const submissions = this.data.submissions.map(s =>
      s._id === id ? { ...s, selected: !s.selected } : s
    )
    const selectedIds = submissions.filter(s => s.selected).map(s => s._id)
    this.setData({ submissions, selectedIds, selectedAll: selectedIds.length === submissions.length })
  },
  toggleSelectAll() {
    const newVal = !this.data.selectedAll
    const submissions = this.data.submissions.map(s => ({ ...s, selected: newVal }))
    const selectedIds = newVal ? submissions.map(s => s._id) : []
    this.setData({ submissions, selectedIds, selectedAll: newVal })
  },
  async approve(e) {
    await reviewApi.approve(e.currentTarget.dataset.id)
    wx.showToast({ title: '已通过' })
    this.loadData()
  },
  async reject(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因（可选）',
      success: async (res) => {
        if (res.confirm) {
          await reviewApi.reject(id, res.content || '未通过审核')
          wx.showToast({ title: '已拒绝' })
          this.loadData()
        }
      }
    })
  },
  async batchApprove() {
    wx.showModal({
      title: '批量通过',
      content: '确定通过选中的 ' + this.data.selectedIds.length + ' 条提交吗？',
      success: async (res) => {
        if (res.confirm) {
          await reviewApi.batchApprove(this.data.selectedIds)
          wx.showToast({ title: '批量通过成功' })
          this.loadData()
        }
      }
    })
  },
  previewImage(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.src] })
  }
})