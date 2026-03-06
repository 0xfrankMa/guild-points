// === API Client ===
const API_BASE = ''

function getToken() {
  return localStorage.getItem('guild_token')
}

function setToken(token) {
  localStorage.setItem('guild_token', token)
}

function clearToken() {
  localStorage.removeItem('guild_token')
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const opts = { method, headers }
  if (body && method !== 'GET') opts.body = JSON.stringify(body)
  const res = await fetch(API_BASE + path, opts)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '请求失败')
  }
  return data
}

async function uploadFile(file) {
  const headers = {
    'Content-Type': file.type || 'image/jpeg',
    'X-Filename': file.name || 'image.jpg'
  }
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(API_BASE + '/api/upload', { method: 'POST', headers, body: file })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data.url
}

// === Router ===
const routes = {}

function route(hash, renderFn) {
  routes[hash] = renderFn
}

function navigate(hash) {
  window.location.hash = hash
}

async function handleRoute() {
  const hash = window.location.hash || '#login'
  const app = document.getElementById('app')

  // Check auth - redirect to login if no token (except login page)
  if (hash !== '#login' && !getToken()) {
    navigate('#login')
    return
  }

  // Find matching route
  let matched = false
  for (const [pattern, renderFn] of Object.entries(routes)) {
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$')
    const match = hash.match(regex)
    if (match) {
      const params = match.slice(1)
      try {
        app.innerHTML = '<div class="loading">加载中...</div>'
        await renderFn(app, ...params)
      } catch (e) {
        console.error(e)
        app.innerHTML = '<div class="page"><div class="empty">' + (e.message || '加载失败') + '</div></div>'
      }
      matched = true
      break
    }
  }

  if (!matched) {
    navigate('#home')
  }
}

window.addEventListener('hashchange', handleRoute)

// === Helper ===
function $(selector) { return document.querySelector(selector) }
function $$(selector) { return document.querySelectorAll(selector) }

function showToast(msg, duration = 2000) {
  const toast = document.createElement('div')
  toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.75);color:#fff;padding:12px 24px;border-radius:8px;z-index:9999;font-size:14px;'
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), duration)
}

function showConfirm(title, content) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;display:flex;align-items:center;justify-content:center;'
    overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px;max-width:300px;width:85%;text-align:center;">' +
      '<div style="font-size:17px;font-weight:bold;margin-bottom:12px;">' + title + '</div>' +
      '<div style="font-size:14px;color:#666;margin-bottom:20px;">' + content + '</div>' +
      '<div style="display:flex;gap:12px;">' +
      '<button id="confirm-cancel" style="flex:1;padding:10px;border-radius:20px;border:1px solid #ddd;background:#fff;font-size:15px;cursor:pointer;">取消</button>' +
      '<button id="confirm-ok" style="flex:1;padding:10px;border-radius:20px;border:none;background:linear-gradient(135deg,#FFD93D,#F5A623);font-weight:bold;font-size:15px;cursor:pointer;">确定</button>' +
      '</div></div>'
    document.body.appendChild(overlay)
    overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false) }
    overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true) }
  })
}

function showPrompt(title, defaultValue) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;display:flex;align-items:center;justify-content:center;'
    overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px;max-width:300px;width:85%;">' +
      '<div style="font-size:17px;font-weight:bold;margin-bottom:12px;text-align:center;">' + title + '</div>' +
      '<input id="prompt-input" style="width:100%;padding:10px;border:1px solid #F0D68A;border-radius:8px;font-size:15px;box-sizing:border-box;margin-bottom:16px;" value="' + (defaultValue || '') + '">' +
      '<div style="display:flex;gap:12px;">' +
      '<button id="prompt-cancel" style="flex:1;padding:10px;border-radius:20px;border:1px solid #ddd;background:#fff;font-size:15px;cursor:pointer;">取消</button>' +
      '<button id="prompt-ok" style="flex:1;padding:10px;border-radius:20px;border:none;background:linear-gradient(135deg,#FFD93D,#F5A623);font-weight:bold;font-size:15px;cursor:pointer;">确定</button>' +
      '</div></div>'
    document.body.appendChild(overlay)
    overlay.querySelector('#prompt-cancel').onclick = () => { overlay.remove(); resolve(null) }
    overlay.querySelector('#prompt-ok').onclick = () => { overlay.remove(); resolve(overlay.querySelector('#prompt-input').value) }
  })
}

// === Page placeholder - pages will be registered below ===
// PAGES_PLACEHOLDER

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  handleRoute()
})
