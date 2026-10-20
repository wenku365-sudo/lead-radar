import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.LR_DATA_DIR || path.join(__dirname, 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(path.join(DATA_DIR, 'lead-radar.db'))
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS platform_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  account_name TEXT,
  adapter TEXT NOT NULL DEFAULT 'mock',
  access_token TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  industry_key TEXT,
  emoji TEXT DEFAULT '🎯',
  desc TEXT,
  keywords TEXT,
  platforms TEXT NOT NULL DEFAULT '["douyin","xhs"]',
  status TEXT NOT NULL DEFAULT 'running',
  videos_found INTEGER NOT NULL DEFAULT 0,
  customers_found INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_run_at TEXT
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  platform_video_id TEXT,
  title TEXT,
  author TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, platform, platform_video_id)
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  task_id INTEGER REFERENCES tasks(id),
  platform TEXT NOT NULL,
  platform_comment_id TEXT NOT NULL,
  nick TEXT NOT NULL,
  avatar_color TEXT,
  industry_key TEXT,
  comment TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'mid',
  tags TEXT NOT NULL DEFAULT '[]',
  video_title TEXT,
  video_author TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  follow_status TEXT NOT NULL DEFAULT 'todo',
  followed INTEGER NOT NULL DEFAULT 0,
  later INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  scored_by TEXT NOT NULL DEFAULT 'rules',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, platform, platform_comment_id)
);

CREATE TABLE IF NOT EXISTS follow_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id),
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_user_industry ON leads(user_id, industry_key);
CREATE INDEX IF NOT EXISTS idx_leads_user_platform ON leads(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_leads_user_level ON leads(user_id, level);
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON leads(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, follow_status);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_logs_lead ON follow_logs(lead_id);
`)

console.log('[db] ready:', path.join(DATA_DIR, 'lead-radar.db'))
