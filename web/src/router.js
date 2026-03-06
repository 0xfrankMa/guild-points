import { jsonResponse } from './auth.js'
import { handleGuildRoutes } from './api/guild.js'
import { handleTaskRoutes } from './api/tasks.js'
import { handleReviewRoutes } from './api/review.js'
import { handleShopRoutes } from './api/shop.js'
import { handleProfileRoutes } from './api/profile.js'
import { handleUploadRoutes } from './api/upload.js'
import { handleStatsRoutes } from './api/stats.js'

export async function handleApiRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      }
    })
  }

  let response
  try {
    if (path.startsWith('/api/guild')) {
      response = await handleGuildRoutes(request, env, path, method)
    } else if (path.startsWith('/api/tasks')) {
      response = await handleTaskRoutes(request, env, path, method)
    } else if (path.startsWith('/api/review')) {
      response = await handleReviewRoutes(request, env, path, method)
    } else if (path.startsWith('/api/rewards') || path.startsWith('/api/exchanges')) {
      response = await handleShopRoutes(request, env, path, method)
    } else if (path.startsWith('/api/profile') || path === '/api/checkin' || path === '/api/members' || path.startsWith('/api/members/')) {
      response = await handleProfileRoutes(request, env, path, method)
    } else if (path === '/api/stats') {
      response = await handleStatsRoutes(request, env, path, method)
    } else if (path === '/api/upload' || path.startsWith('/api/file/')) {
      response = await handleUploadRoutes(request, env, path, method)
    } else {
      response = jsonResponse({ error: 'Not found' }, 404)
    }
  } catch (e) {
    console.error(e)
    response = jsonResponse({ error: '服务器错误' }, 500)
  }

  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  return new Response(response.body, { status: response.status, headers })
}
