/**
 * 种子数据：空库时自动创建演示账号 + 7 个任务 + 372 条线索（复用前端 mock 生成器）。
 * 也可手动执行：node server/seed.js（会跳过已有数据）
 */
import bcrypt from 'bcryptjs'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { db } from './db.js'
import { nowISO } from './map.js'
import { generateCustomers, DEFAULT_TASKS, INDUSTRIES } from '../src/data/mock.js'

export function seedIfEmpty() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM users').get().n
  if (n > 0) {
    return false
  }
  seed()
  return true
}

export function seed() {
  // 演示账号
  const hash = bcrypt.hashSync('demo123', 10)
  const u = db
    .prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
    .run('demo', hash, '演示账号')
  const uid = Number(u.lastInsertRowid)

  // 授权平台账号（mock 适配器）
  db.prepare(
    'INSERT INTO platform_accounts (user_id, platform, account_name, adapter, status) VALUES (?, ?, ?, ?, ?)'
  ).run(uid, 'douyin', '家居生活馆', 'mock', 'connected')
  db.prepare(
    'INSERT INTO platform_accounts (user_id, platform, account_name, adapter, status) VALUES (?, ?, ?, ?, ?)'
  ).run(uid, 'xhs', '家居种草日记', 'mock', 'connected')

  // 任务
  const insertTask = db.prepare(
    `INSERT INTO tasks (user_id, title, industry_key, emoji, desc, keywords, status, videos_found, customers_found, last_run_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const t of DEFAULT_TASKS) {
    const ind = INDUSTRIES.find((i) => i.name === t.industry)
    insertTask.run(
      uid, t.title, ind ? ind.key : null, t.emoji, t.desc,
      JSON.stringify(ind ? ind.tags.slice(0, 3) : []),
      'running', t.videos, t.customers,
      new Date(Date.now() - (1 + Math.random() * 10) * 3600e3).toISOString()
    )
  }

  // 线索：today 的落在今天几小时内，其余散布在过去 40 天
  const insertLead = db.prepare(
    `INSERT OR IGNORE INTO leads
     (user_id, platform, platform_comment_id, nick, avatar_color, industry_key,
      comment, score, level, tags, video_title, video_author, likes, scored_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'rules', ?)`
  )
  const customers = generateCustomers()
  for (const c of customers) {
    const platform = c.platform === '抖音' ? 'douyin' : 'xhs'
    const createdAt = c.today
      ? new Date(Date.now() - Math.random() * 8 * 3600e3).toISOString()
      : new Date(Date.now() - (1 + Math.random() * 40) * 86400e3).toISOString()
    insertLead.run(
      uid, platform, `seed-${platform}-${c.id}`, c.nick, c.avatarColor, c.industryKey,
      c.comment, c.score, c.level, JSON.stringify(c.tags), c.srcVideo, c.srcAuthor, c.likes, createdAt
    )
  }

  console.log(`[seed] 完成：账号 demo/demo123 · 任务 ${DEFAULT_TASKS.length} 个 · 线索 ${customers.length} 条`)
}

const isMain = (() => {
  try {
    return process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
})()
if (isMain) {
  const did = seedIfEmpty()
  console.log(did ? '[seed] 已导入' : '[seed] 库非空，跳过')
}
