# Guild Points Web Version Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile web version of the guild points system with the same features as the WeChat mini program, deployed on Cloudflare.

**Architecture:** Pure HTML/CSS/JS single-page app with hash routing, Cloudflare Workers as API backend, Cloudflare D1 (SQLite) for data, Cloudflare R2 for screenshot storage.

**Tech Stack:** HTML/CSS/JS, Cloudflare Workers, D1, R2

---

## Architecture

- Frontend: Static SPA served by Cloudflare Pages
- Backend: Cloudflare Workers (serverless API at /api/*)
- Database: Cloudflare D1 (SQLite)
- File storage: Cloudflare R2 (screenshots, avatars)
- Auth: Random token stored in localStorage, sent via Authorization header

## Pages (6 pages, hash routing)

1. Login - Create guild / Join guild (invite code + nickname)
2. Home - Points card, today's tasks, quick actions
3. Task Detail - Task info, upload screenshot, submission history
4. Shop - Browse rewards, exchange points
5. Profile - Avatar, nickname, daily checkin, rankings, invite, leave guild
6. Admin - Tabs: publish task, review submissions, manage rewards, manage members

## Database Schema (D1 SQLite)

### guilds
- id TEXT PRIMARY KEY
- name TEXT NOT NULL
- invite_code TEXT UNIQUE NOT NULL
- checkin_slogan TEXT DEFAULT '...'
- created_by TEXT NOT NULL
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP

### users
- id TEXT PRIMARY KEY (random token)
- nickname TEXT NOT NULL
- role TEXT NOT NULL (master/admin/member)
- guild_id TEXT NOT NULL (FK guilds.id)
- avatar_url TEXT DEFAULT ''
- points INTEGER DEFAULT 0
- total_earned INTEGER DEFAULT 0
- total_spent INTEGER DEFAULT 0
- last_checkin TEXT DEFAULT ''
- checkin_streak INTEGER DEFAULT 0
- token TEXT UNIQUE NOT NULL
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP

### tasks
- id TEXT PRIMARY KEY
- guild_id TEXT NOT NULL
- title TEXT NOT NULL
- description TEXT DEFAULT ''
- points INTEGER NOT NULL
- verify_type TEXT DEFAULT 'self_check'
- daily INTEGER DEFAULT 0
- max_completions INTEGER DEFAULT 1
- status TEXT DEFAULT 'active'
- created_by TEXT NOT NULL
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP

### submissions
- id TEXT PRIMARY KEY
- task_id TEXT NOT NULL
- user_id TEXT NOT NULL
- screenshot_url TEXT
- status TEXT DEFAULT 'pending'
- reviewed_by TEXT
- reject_reason TEXT
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP

### rewards
- id TEXT PRIMARY KEY
- guild_id TEXT NOT NULL
- name TEXT NOT NULL
- type TEXT DEFAULT 'game_item'
- cost INTEGER NOT NULL
- stock INTEGER DEFAULT -1
- status TEXT DEFAULT 'active'
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP

### exchanges
- id TEXT PRIMARY KEY
- user_id TEXT NOT NULL
- reward_id TEXT NOT NULL
- reward_name TEXT NOT NULL
- status TEXT DEFAULT 'pending'
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP

## Auth Flow

1. Create/Join guild -> server generates random token -> returned to client
2. Client stores token in localStorage
3. All API requests include Authorization: Bearer <token>
4. Server looks up user by token
5. Lost token = rejoin guild

## API Endpoints

- POST /api/guild/create - {name, nickname} -> {token, inviteCode}
- POST /api/guild/join - {inviteCode, nickname} -> {token}
- GET /api/profile - user info
- PUT /api/profile/nickname - {nickname}
- POST /api/checkin - daily checkin
- GET /api/guild/settings - checkin slogan
- PUT /api/guild/slogan - {slogan} (admin)
- GET /api/members - list members (admin)
- PUT /api/members/:id/role - {role} (master)
- DELETE /api/members/:id - remove member (master)
- POST /api/guild/transfer - {targetUserId} (master)
- POST /api/guild/leave - leave guild
- GET /api/tasks - list tasks
- POST /api/tasks - publish task (admin)
- DELETE /api/tasks/:id - cancel task (admin)
- POST /api/tasks/:id/submit - submit task
- GET /api/tasks/:id/submissions - my submissions
- GET /api/review - pending submissions (admin)
- POST /api/review/:id/approve - approve (admin)
- POST /api/review/:id/reject - {reason} reject (admin)
- POST /api/review/batch-approve - {ids} (admin)
- GET /api/rewards - list rewards
- POST /api/rewards - add reward (admin)
- PUT /api/rewards/:id - update reward (admin)
- POST /api/rewards/:id/exchange - exchange points
- GET /api/exchanges/mine - my exchanges
- GET /api/exchanges/pending - pending exchanges (admin)
- POST /api/exchanges/:id/fulfill - mark fulfilled (admin)
- POST /api/upload - upload screenshot/avatar -> {url}

## Visual Design

Reuse the Capybara Go warm golden/brown theme from the mini program:
- Background: #FFF8E7
- Primary: #F5A623 golden
- Text: #4A3728 dark brown
- Cards: #FFFDF5 with #F0D68A borders
- Same emoji icons and decorative elements

## Differences from Mini Program

- No WeChat login; token-based auth
- Guild info stored in separate guilds table
- Screenshots stored in Cloudflare R2
- Hash-based SPA routing instead of page navigation
- Share via copy link instead of WeChat share
