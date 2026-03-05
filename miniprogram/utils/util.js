function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function isAdmin(role) {
  return role === 'master' || role === 'admin'
}

function isMaster(role) {
  return role === 'master'
}

function roleLabel(role) {
  const labels = { master: '会长', admin: '管理员', member: '成员' }
  return labels[role] || '未知'
}

function statusLabel(status) {
  const labels = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    fulfilled: '已发放',
    cancelled: '已取消',
    active: '进行中',
    expired: '已过期'
  }
  return labels[status] || status
}

module.exports = { formatDate, isAdmin, isMaster, roleLabel, statusLabel }
