/**
 * 采集 Worker：定时扫描运行中的任务 → 适配器拉新评论 → 打分 → 去重落库 → WebSocket 推送。
 * 单进程内跑定时器（setInterval + 防重入），后续量大可换 BullMQ 等独立队列。
 */
import { db } from '../db.js'
import { mapLead, nowISO, IND_BY_KEY } from '../map.js'
import { ADAPTERS } from './adapters/mock-adapter.js'
import { scoreLead } from '../llm/provider.js'

let ticking = false

function videoKey(platform, title) {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0
  return `${platform}-v-${h}`
}

/** 对单个任务跑一轮采集，返回新增线索数 */
export async function runTaskOnce(task, hub) {
  const accounts = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ? AND status = ?')
    .all(task.user_id, 'connected')
  const adapter = ADAPTERS[accounts[0]?.adapter || 'mock'] || ADAPTERS.mock

  const comments = adapter.fetchNewComments(task, accounts)
  let added = 0
  const videoIds = new Set()

  for (const c of comments) {
    const { score, level, tags, source } = await scoreLead(c.comment, task.industry_key)

    // 视频幂等入库
    const pvid = videoKey(c.platform, c.videoTitle)
    db.prepare(
      'INSERT OR IGNORE INTO videos (user_id, platform, platform_video_id, title, author) VALUES (?, ?, ?, ?, ?)'
    ).run(task.user_id, c.platform, pvid, c.videoTitle, c.videoAuthor)
    const videoRow = db
      .prepare('SELECT id FROM videos WHERE user_id = ? AND platform = ? AND platform_video_id = ?')
      .get(task.user_id, c.platform, pvid)
    if (videoRow) videoIds.add(videoRow.id)

    // 评论幂等入库（platform_comment_id 唯一索引去重）
    const info = db
      .prepare(
        `INSERT OR IGNORE INTO leads
         (user_id, task_id, platform, platform_comment_id, nick, avatar_color, industry_key,
          comment, score, level, tags, video_title, video_author, likes, scored_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        task.user_id, task.id, c.platform, c.platformCommentId, c.nick, c.avatarColor || '#5b5bd6',
        task.industry_key, c.comment, score, level, JSON.stringify(tags || []),
        c.videoTitle, c.videoAuthor, c.likes || 0, source, nowISO()
      )

    if (info.changes > 0) {
      added++
      const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid)
      if (hub && row) hub.broadcast(task.user_id, { type: 'lead:new', lead: mapLead(row) })
    }
  }

  db.prepare(
    'UPDATE tasks SET last_run_at = ?, videos_found = videos_found + ?, customers_found = customers_found + ? WHERE id = ?'
  ).run(nowISO(), videoIds.size, added, task.id)

  return added
}

/** 启动常驻轮询 */
export function startWorker(hub) {
  const INTERVAL = Number(process.env.LR_COLLECT_INTERVAL_MS || 12000)
  const tick = async () => {
    if (ticking) return
    ticking = true
    try {
      const tasks = db.prepare("SELECT * FROM tasks WHERE status = 'running'").all()
      for (const t of tasks) {
        try {
          await runTaskOnce(t, hub)
        } catch (e) {
          console.error(`[worker] 任务 ${t.id} 采集失败:`, e.message)
        }
      }
    } finally {
      ticking = false
    }
  }
  setInterval(tick, INTERVAL)
  console.log(`[worker] 已启动，轮询间隔 ${INTERVAL}ms（LR_COLLECT_INTERVAL_MS 可调）`)
}
