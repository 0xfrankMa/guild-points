export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export function generateToken() {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
