const { shopApi } = require('../../../utils/api')

Page({
  data: {
    name: '', cost: '', stock: '', type: 'cash',
    rewards: [], exchanges: []
  },
  onShow() { this.loadData() },
  async loadData() {
    const [rewardRes, exRes] = await Promise.all([
      shopApi.listRewards(),
      shopApi.pendingExchanges()
    ])
    this.setData({
      rewards: rewardRes.rewards || [],
      exchanges: exRes.exchanges || []
    })
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }) },
  setType(e) { this.setData({ type: e.currentTarget.dataset.type }) },
  async addReward() {
    if (!this.data.name || !this.data.cost) {
      wx.showToast({ title: '请填写名称和积分', icon: 'none' })
      return
    }
    await shopApi.addReward({
      name: this.data.name, type: this.data.type,
      cost: this.data.cost, stock: this.data.stock
    })
    wx.showToast({ title: '添加成功' })
    this.setData({ name: '', cost: '', stock: '' })
    this.loadData()
  },
  async toggleRewardStatus(e) {
    const { id, status } = e.currentTarget.dataset
    const newStatus = status === 'active' ? 'hidden' : 'active'
    await shopApi.updateReward({ rewardId: id, status: newStatus })
    this.loadData()
  },
  async fulfill(e) {
    await shopApi.fulfillExchange(e.currentTarget.dataset.id)
    wx.showToast({ title: '已标记发放' })
    this.loadData()
  }
})