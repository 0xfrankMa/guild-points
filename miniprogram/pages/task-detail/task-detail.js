const { taskApi } = require('../../utils/api')

Page({
  data: {
    task: null,
    submissions: [],
    screenshotPath: '',
    screenshotFileId: '',
    submitting: false
  },

  onLoad(options) {
    this.taskId = options.id
    this.loadTask()
  },

  onShow() {
    this.loadTask()
  },

  async loadTask() {
    const res = await taskApi.list()
    const task = (res.tasks || []).find(t => t._id === this.taskId)
    if (task) {
      this.setData({ task })
    }
    const subRes = await taskApi.mySubmissions(this.taskId)
    this.setData({ submissions: subRes.submissions || [] })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ screenshotPath: res.tempFiles[0].tempFilePath })
      }
    })
  },

  async submitTask() {
    const task = this.data.task
    if (task.verify_type === 'screenshot' && !this.data.screenshotPath) {
      wx.showToast({ title: '请先上传截图', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      let screenshotFileId = null

      if (this.data.screenshotPath) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: 'screenshots/' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.jpg',
          filePath: this.data.screenshotPath
        })
        screenshotFileId = uploadRes.fileID
      }

      const res = await taskApi.submit(this.taskId, screenshotFileId)
      const msg = res.status === 'approved' ? '打卡成功! 积分已到账' : '提交成功! 等待管理员审核'
      wx.showToast({ title: msg, icon: 'none', duration: 2000 })

      this.setData({ screenshotPath: '', screenshotFileId: '' })
      this.loadTask()
    } catch (e) {
      console.error(e)
    }
    this.setData({ submitting: false })
  }
})
