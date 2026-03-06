# Guild Points Web Version Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile web version of the guild points system using Cloudflare Workers + D1 + pure HTML/CSS/JS.

**Architecture:** Cloudflare Workers serves both static frontend and API routes. D1 SQLite for data. R2 for file uploads. Single-page app with hash routing. Token-based auth via localStorage.

**Tech Stack:** HTML/CSS/JS, Cloudflare Workers (ES modules), D1 (SQLite), R2, Wrangler CLI

---

### Task 1: Project Scaffolding & Cloudflare Setup

**Files:**
- Create: `web/wrangler.toml`
- Create: `web/package.json`
- Create: `web/src/index.js` (Worker entry)
- Create: `web/public/index.html` (SPA shell)

**Step 1: Create project structure**

```
web/
  public/          # Static frontend files
    index.html
    style.css
    app.js
  src/
    index.js       # Worker entry point
    router.js      # API router
    db.js          # D1 database helpers
    auth.js        # Auth middleware
  schema.sql       # D1 schema
  wrangler.toml
  package.json
```

**Step 2: Create `web/package.json`**

```json
{
  "name": "guild-points-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
```

**Step 3: Create `web/wrangler.toml`**

```toml
name = "guild-points-web"
main = "src/index.js"
compatibility_date = "2024-01-01"

[site]
bucket = "./public"

[[d1_databases]]
binding = "DB"
database_name = "guild-points"
database_id = "placeholder-will-be-replaced"

[[r2_buckets]]
binding = "R2"
bucket_name = "guild-points-uploads"
```

**Step 4: Create `web/src/index.js`** (Worker entry)

```js
import { handleApiRequest } from './router.js'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env)
    }

    // Serve static files - try exact path first, fallback to index.html for SPA
    const assetUrl = new URL(request.url)
    let response = await env.ASSETS.fetch(assetUrl)
    if (response.status === 404) {
      assetUrl.pathname = '/index.html'
      response = await env.ASSETS.fetch(assetUrl)
    }
    return response
  }
}
```

**Step 5: Create minimal `web/public/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>工会积分</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="app"></div>
  <script src="/app.js"></script>
</body>
</html>
```

**Step 6: Install dependencies and verify**

```bash
cd web && npm install
```

**Step 7: Commit**

```bash
git add web/
git commit -m "feat(web): scaffold project with Cloudflare Workers setup"
```

---

### Task 2: D1 Database Schema

**Files:**
- Create: `web/schema.sql`
- Create: `web/src/db.js`

**Step 1: Create `web/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS guilds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  checkin_slogan TEXT DEFAULT '膜拜嫂子看黑山',
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  guild_id TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  points INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  last_checkin TEXT DEFAULT '',
  checkin_streak INTEGER DEFAULT 0,
  token TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  points INTEGER NOT NULL,
  verify_type TEXT DEFAULT 'self_check',
  daily INTEGER DEFAULT 0,
  max_completions INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reject_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'game_item',
  cost INTEGER NOT NULL,
  stock INTEGER DEFAULT -1,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exchanges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  reward_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Step 2: Create `web/src/db.js`**

```js
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
```

**Step 3: Commit**

```bash
git add web/schema.sql web/src/db.js
git commit -m "feat(web): add D1 database schema and helpers"
```

---

### Task 3: Auth Middleware & API Router

**Files:**
- Create: `web/src/auth.js`
- Create: `web/src/router.js`

**Step 1: Create `web/src/auth.js`**

```js
export async function getUser(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const user = await env.DB.prepare('SELECT * FROM users WHERE token = ?').bind(token).first()
  return user || null
}

export async function requireUser(request, env) {
  const user = await getUser(request, env)
  if (!user) {
    return { error: jsonResponse({ error: '未登录' }, 401) }
  }
  return { user }
}

export async function requireAdmin(request, env) {
  const result = await requireUser(request, env)
  if (result.error) return result
  if (result.user.role !== 'master' && result.user.role !== 'admin') {
    return { error: jsonResponse({ error: '无权限' }, 403) }
  }
  return result
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}
```

**Step 2: Create `web/src/router.js`**

```js
import { jsonResponse } from './auth.js'
import { handleGuildRoutes } from './api/guild.js'
import { handleTaskRoutes } from './api/tasks.js'
import { handleReviewRoutes } from './api/review.js'
import { handleShopRoutes } from './api/shop.js'
import { handleProfileRoutes } from './api/profile.js'
import { handleUploadRoutes } from './api/upload.js'

export async function handleApiRequest(request, env) {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  // CORS
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
    } else if (path === '/api/upload') {
      response = await handleUploadRoutes(request, env)
    } else {
      response = jsonResponse({ error: 'Not found' }, 404)
    }
  } catch (e) {
    console.error(e)
    response = jsonResponse({ error: '服务器错误' }, 500)
  }

  // Add CORS headers
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  return new Response(response.body, { status: response.status, headers })
}
```

**Step 3: Commit**

```bash
git add web/src/auth.js web/src/router.js
git commit -m "feat(web): add auth middleware and API router"
```

---

### Task 4: Guild API (create, join, settings, leave, transfer)

**Files:**
- Create: `web/src/api/guild.js`

**Step 1: Create `web/src/api/guild.js`**

Full guild API implementation including:
- POST /api/guild/create - create guild + master user, return token
- POST /api/guild/join - join guild by invite code, return token
- GET /api/guild/settings - get guild checkin slogan
- PUT /api/guild/slogan - update checkin slogan (admin+)
- POST /api/guild/leave - leave guild (master checks member count)
- POST /api/guild/transfer - transfer master role

Each endpoint: parse JSON body, validate input, run D1 queries, return JSON response.

**Step 2: Commit**

```bash
git add web/src/api/guild.js
git commit -m "feat(web): add guild API endpoints"
```

---

### Task 5: Profile & Members API

**Files:**
- Create: `web/src/api/profile.js`

**Step 1: Create `web/src/api/profile.js`**

Endpoints:
- GET /api/profile - get current user info + guild name
- PUT /api/profile/nickname - update nickname
- POST /api/checkin - daily checkin (+1 point, streak tracking)
- GET /api/members - list guild members (admin+)
- PUT /api/members/:id/role - set role (master only)
- DELETE /api/members/:id - remove member (master only)

**Step 2: Commit**

```bash
git add web/src/api/profile.js
git commit -m "feat(web): add profile and members API"
```

---

### Task 6: Tasks API (publish, list, submit)

**Files:**
- Create: `web/src/api/tasks.js`

**Step 1: Create `web/src/api/tasks.js`**

Endpoints:
- GET /api/tasks - list active tasks with today's submission count per user
- POST /api/tasks - publish task (admin+)
- DELETE /api/tasks/:id - cancel task (admin+)
- POST /api/tasks/:id/submit - submit task (self-check auto-approves, screenshot -> pending)
- GET /api/tasks/:id/submissions - my submissions for a task

Daily completion limit enforcement using today's date filter.

**Step 2: Commit**

```bash
git add web/src/api/tasks.js
git commit -m "feat(web): add tasks API endpoints"
```

---

### Task 7: Review API

**Files:**
- Create: `web/src/api/review.js`

**Step 1: Create `web/src/api/review.js`**

Endpoints:
- GET /api/review - pending submissions with user nickname and task title (admin+)
- POST /api/review/:id/approve - approve submission, award points (admin+)
- POST /api/review/:id/reject - reject with reason (admin+)
- POST /api/review/batch-approve - batch approve by IDs (admin+)

**Step 2: Commit**

```bash
git add web/src/api/review.js
git commit -m "feat(web): add review API endpoints"
```

---

### Task 8: Shop API (rewards, exchanges)

**Files:**
- Create: `web/src/api/shop.js`

**Step 1: Create `web/src/api/shop.js`**

Endpoints:
- GET /api/rewards - list active rewards + user's points
- POST /api/rewards - add reward (admin+)
- PUT /api/rewards/:id - update reward status (admin+)
- POST /api/rewards/:id/exchange - exchange points for reward (check balance, stock)
- GET /api/exchanges/mine - my exchange history
- GET /api/exchanges/pending - pending exchanges (admin+)
- POST /api/exchanges/:id/fulfill - mark as fulfilled (admin+)

**Step 2: Commit**

```bash
git add web/src/api/shop.js
git commit -m "feat(web): add shop API endpoints"
```

---

### Task 9: File Upload API (R2)

**Files:**
- Create: `web/src/api/upload.js`

**Step 1: Create `web/src/api/upload.js`**

POST /api/upload - accept multipart form data, store in R2, return public URL.
Used for screenshots and avatars. Generate unique filename with timestamp.

**Step 2: Commit**

```bash
git add web/src/api/upload.js
git commit -m "feat(web): add file upload API with R2 storage"
```

---

### Task 10: Frontend - Global Styles & SPA Router

**Files:**
- Modify: `web/public/index.html`
- Create: `web/public/style.css`
- Create: `web/public/app.js`

**Step 1: Create `web/public/style.css`**

Full CSS with Capybara Go theme:
- Variables: --bg (#FFF8E7), --primary (#F5A623), --text (#4A3728), --card (#FFFDF5), --border (#F0D68A)
- Mobile-first responsive layout (max-width: 750px centered)
- Card, button, input, form, tag, badge component styles
- Page transition classes
- Match the mini program visual style exactly

**Step 2: Update `web/public/index.html`**

Full SPA shell with nav bar structure.

**Step 3: Create `web/public/app.js`**

SPA framework:
- Hash router: listen to hashchange, render page functions
- `api(method, path, body)` helper: fetch with Authorization header
- `getToken()` / `setToken()` localStorage helpers
- Page render functions: each returns HTML string, sets up event listeners after render
- Navigation helper functions

**Step 4: Commit**

```bash
git add web/public/
git commit -m "feat(web): add global styles, SPA router, and API client"
```

---

### Task 11: Frontend - Login Page

**Files:**
- Modify: `web/public/app.js`

**Step 1: Add login page**

`renderLogin()`:
- Capybara logo header with crown
- Tab bar: join / create
- Join form: invite code + nickname inputs
- Create form: guild name + nickname inputs
- Call POST /api/guild/join or /api/guild/create
- Store returned token in localStorage
- Navigate to #home on success

**Step 2: Commit**

```bash
git add web/public/app.js
git commit -m "feat(web): add login page"
```

---

### Task 12: Frontend - Home Page

**Files:**
- Modify: `web/public/app.js`

**Step 1: Add home page**

`renderHome()`:
- Points overview card with capybara watermark
- Stats: total earned / spent
- Quick action buttons: shop, profile, admin (if admin)
- Today's task list with points, verify type tags, completion status
- Click task -> navigate to #task/:id
- Empty state with sleeping capybara

**Step 2: Commit**

```bash
git add web/public/app.js
git commit -m "feat(web): add home page"
```

---

### Task 13: Frontend - Task Detail Page

**Files:**
- Modify: `web/public/app.js`

**Step 1: Add task detail page**

`renderTaskDetail(taskId)`:
- Task info card: title, description, points, verify type, today's completions
- Screenshot upload area (file input styled as dashed box)
- Submit button with progress text
- Submission history list with status badges
- Upload via POST /api/upload then POST /api/tasks/:id/submit

**Step 2: Commit**

```bash
git add web/public/app.js
git commit -m "feat(web): add task detail page"
```

---

### Task 14: Frontend - Shop Page

**Files:**
- Modify: `web/public/app.js`

**Step 1: Add shop page**

`renderShop()`:
- My points display at top
- Reward grid: name, type icon, cost, stock
- Exchange button per item (confirm dialog)
- My exchanges history tab

**Step 2: Commit**

```bash
git add web/public/app.js
git commit -m "feat(web): add shop page"
```

---

### Task 15: Frontend - Profile Page

**Files:**
- Modify: `web/public/app.js`

**Step 1: Add profile page**

`renderProfile()`:
- User card: avatar, nickname (editable), role, points
- Daily checkin card with custom slogan, streak display
- Stats row: earned / spent
- Rankings list with medal emojis
- Invite section: invite code display, copy button, share link
- Leave guild button (danger zone)

**Step 2: Commit**

```bash
git add web/public/app.js
git commit -m "feat(web): add profile page"
```

---

### Task 16: Frontend - Admin Page

**Files:**
- Modify: `web/public/app.js`

**Step 1: Add admin page with tabs**

`renderAdmin()`:
- Tab bar: publish / review / rewards / members
- Publish tab: task form (title, description, points, verify type, max completions, daily toggle)
- Review tab: pending submissions with screenshots, approve/reject/batch-approve buttons
- Rewards tab: add reward form + reward list (toggle active/hidden) + pending exchanges
- Members tab: member list with role management + remove button

**Step 2: Commit**

```bash
git add web/public/app.js
git commit -m "feat(web): add admin page with all tabs"
```

---

### Task 17: Cloudflare Deployment Setup

**Step 1: Install Wrangler and login**

```bash
cd web && npm install
npx wrangler login
```

**Step 2: Create D1 database**

```bash
npx wrangler d1 create guild-points
```
Update `wrangler.toml` with the returned database_id.

**Step 3: Apply schema**

```bash
npx wrangler d1 execute guild-points --file=schema.sql
```

**Step 4: Create R2 bucket**

```bash
npx wrangler r2 bucket create guild-points-uploads
```

**Step 5: Deploy**

```bash
npx wrangler deploy
```

**Step 6: Test live site**

Open the deployed URL, create a guild, verify everything works.

**Step 7: Commit final config**

```bash
git add web/wrangler.toml
git commit -m "feat(web): configure Cloudflare deployment"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Project scaffolding | None |
| 2 | D1 schema & helpers | 1 |
| 3 | Auth & router | 1 |
| 4 | Guild API | 2, 3 |
| 5 | Profile & members API | 2, 3 |
| 6 | Tasks API | 2, 3 |
| 7 | Review API | 2, 3 |
| 8 | Shop API | 2, 3 |
| 9 | Upload API (R2) | 3 |
| 10 | Frontend styles & SPA router | 1 |
| 11 | Login page | 4, 10 |
| 12 | Home page | 6, 10 |
| 13 | Task detail page | 6, 9, 10 |
| 14 | Shop page | 8, 10 |
| 15 | Profile page | 5, 10 |
| 16 | Admin page | 5, 6, 7, 8, 10 |
| 17 | Deployment | All |

Tasks 4-9 are independent of each other (can be parallelized).
Tasks 11-16 are independent of each other (can be parallelized).
