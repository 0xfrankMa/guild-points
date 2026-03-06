const { taskApi } = require('../../utils/api')

function uploadFile(filePath, onProgress) {
  return new Promise((resolve, reject) => {
    const uploadTask = wx.cloud.uploadFile({
      cloudPath: 'screenshots/' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.jpg',
      filePath,
      success: res => resolve(res.fileID),
      fail: err => reject(err)
    })
    if (uploadTask && uploadTask.onProgressUpdate) {
      uploadTask.onProgressUpdate(res => {
        if (onProgress) onProgress(res.progress)
      })
    }
  })
}

Page({
  data: {
    task: null,
    submissions: [],
    screenshotPath: '',
    submitting: false,
    submitText: '',
    loading: true
  },

  onLoad(options) {
    this.taskId = options.id
    this.loadTask()
  },

  loadTask() {
    const that = this
    wx.cloud.callFunction({
      name: 'task',
      data: { action: 'list' },
      success(res) {
        if (res.result && res.result.success) {
          const task = (res.result.tasks || []).find(t => t._id === that.taskId)
          if (task) that.setData({ task, loading: false })
        }
      }
    })
    wx.cloud.callFunction({
      name: 'task',
      data: { action: 'mySubmissions', taskId: this.taskId },
      success(res) {
        if (res.result && res.result.success) {
          that.setData({ submissions: res.result.submissions || [] })
        }
      }
    })
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
    if (this.data.submitting) return
    const task = this.data.task
    if (task.verify_type === 'screenshot' && !this.data.screenshotPath) {
      wx.showToast({ title: '请先上传截图', icon: 'none' })
      return
    }

    this.setData({ submitting: true, submitText: '提交中...' })

    try {
      let screenshotFileId = null
      if (this.data.screenshotPath) {
        this.setData({ submitText: '上传中 0%' })
        screenshotFileId = await uploadFile(this.data.screenshotPath, (progress) => {
          this.setData({ submitText: '上传中 ' + progress + '%' })
        })
        this.setData({ submitText: '提交中...' })
      }

      const res = await taskApi.submit(this.taskId, screenshotFileId)
      const isApproved = res.status === 'approved'

      this.setData({ submitting: false, screenshotPath: '' })
      wx.showModal({
        title: isApproved ? '打卡成功' : '提交成功',
        content: isApproved ? '积分已到账，继续加油！' : '截图已提交，等待管理员审核',
        showCancel: false,
        confirmText: '好的',
        confirmColor: '#F5A623',
        complete: () => {
          this.loadTask()
        }
      })
    } catch (e) {
      console.error('submit failed:', e)
      this.setData({ submitting: false })
      const errMsg = (e && e.errMsg) || (e && e.message) || '提交失败'
      wx.showModal({
        title: '提交失败',
        content: errMsg.indexOf('uploadFile') >= 0 ? '截图上传失败，请检查网络后重试' : errMsg,
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#F5A623'
      })
    }
  }
})
