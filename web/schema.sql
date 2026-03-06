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
  guild_id TEXT NOT NULL,
  cost INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
