const { shopApi } = require('../../utils/api')

Page({
  data: {
    rewards: [],
    exchanges: [],
    myPoints: 0
  },

  onShow() {
    this.loadData()
  },

  async loadData() {
    const [rewardRes, exchangeRes] = await Promise.all([
      shopApi.listRewards(),
      shopApi.myExchanges()
    ])
    this.setData({
      rewards: rewardRes.rewards || [],
      myPoints: rewardRes.myPoints || 0,
      exchanges: exchangeRes.exchanges || []
    })
  },

  exchangeReward(e) {
    const { id, name, cost } = e.currentTarget.dataset
    wx.showModal({
      title: '确认兑换',
      content: '确定用 ' + cost + ' 积分兑换「' + name + '」吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await shopApi.exchange(id)
            wx.showToast({ title: '兑换成功! 等待管理员发放' })
            this.loadData()
          } catch (e) {
            console.error(e)
          }
        }
      }
    })
  }
})
