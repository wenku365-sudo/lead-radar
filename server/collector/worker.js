/**
 * 采集 Worker：定时扫描运行中的任务 → 适配器按搜索关键词搜对标视频 → 拉取评论
 * → 匹配词过滤 → 意向打分 → 去重落库 → WebSocket 推送。
 *
 * 管线（适配器无关，mock / 真实 HTTP 通道同一套代码）：
 *   1. searchVideos(task.searchKeywords)   每轮搜 2-5 条对标视频
 *   2. fetchComments(video)                每条视频拉一批评论
 *   3. 命中 task.matchWords 任意一个        才进入下一步（匹配词过滤）
 *   4. scoreLead()                         规则引擎 / LLM 意向打分
 *   5. (user_id, platform, comment_id) 唯一索引幂等去重
 *   6. lead:new WebSocket 实时推送
 */
import { db } from '../db.js'
import { mapLead, mapTask, nowISO, safeJSON, IND_BY_KEY } from '../map.js'
import { resolveAdapter } from './adapters/index.js'
import { scoreLead } from '../llm/provider.js'

let ticking = false

/** 评论是否命中匹配词（不区分大小写） */
export function hitMatchWords(comment, matchWords) {
  if (!matchWords || !matchWords.length) return true // 未配置匹配词 = 不过滤
  const lower = String(comment).toLowerCase()
  return matchWords.some((w) => lower.includes(String(w).toLowerCase()))
}

/** 任务的匹配词：优先任务自带；存量任务为空时回退行业默认关键词 */
export function taskMatchWords(task) {
  const words = safeJSON(task.match_words, [])
  if (words.length) return words
  const ind = IND_BY_KEY[task.industry_key]
  return ind ? ind.keywords : []
}

/** 插入单条线索（幂等），返回是否新增 */
async function insertLead(task, c, hub) {
  const { score, level, tags, source } = await scoreLead(c.comment, task.industry_key)

  // 视频幂等入库
  db.prepare(
    'INSERT OR IGNORE INTO videos (user_id, platform, platform_video_id, title, author, likes, comments) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(task.user_id, c.platform, c.videoId || c.videoTitle, c.videoTitle, c.videoAuthor, c.videoLikes || 0, 0)

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
    const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid)
    if (hub && row) hub.broadcast(task.user_id, { type: 'lead:new', lead: mapLead(row) })
    return true
  }
  return false
}

/** 对单个任务跑一轮采集，返回 { videos, scanned, matched, added } */
export async function runTaskOnce(task, hub) {
  const adapter = resolveAdapter()
  const searchKeywords = safeJSON(task.search_keywords, [])
  const ind = IND_BY_KEY[task.industry_key]
  const searchKws = searchKeywords.length ? searchKeywords : ind ? [ind.searchWord] : []
  const matchWords = taskMatchWords(task)
  const industryKey = task.industry_key

  // 1. 按搜索关键词搜对标视频
  const videos = await adapter.searchVideos({ keywords: searchKws, industryKey, count: 10 })
  if (!videos.length) return { videos: 0, scanned: 0, matched: 0, added: 0 }

  let scanned = 0
  let matched = 0
  let added = 0
  const seenVideoIds = new Set()

  // 2. 逐视频拉评论 → 3. 匹配词过滤 → 4/5/6. 打分去重推送
  for (const v of videos.slice(0, 5)) {
    let comments = []
    try {
      comments = await adapter.fetchComments(v, { industryKey, count: 50 })
    } catch (e) {
      console.warn(`[worker] 拉取评论失败（视频 ${v.title}）:`, e.message)
      continue
    }
    scanned += comments.length

    for (const c of comments) {
      if (!hitMatchWords(c.comment, matchWords)) continue
      matched++
      c.videoId = v.platformVideoId
      c.videoLikes = v.likes
      if (await insertLead(task, c, hub)) added++
    }
    seenVideoIds.add(v.platformVideoId)
  }

  db.prepare(
    'UPDATE tasks SET last_run_at = ?, videos_found = videos_found + ?, customers_found = customers_found + ? WHERE id = ?'
  ).run(nowISO(), seenVideoIds.size, added, task.id)

  if (added > 0) {
    console.log(
      `[worker] 任务「${task.title}」本轮：视频 ${seenVideoIds.size} · 扫描评论 ${scanned} · 命中 ${matched} · 新增线索 ${added}`
    )
  }
  return { videos: seenVideoIds.size, scanned, matched, added }
}

/** 手动触发一轮（路由用，同时返回最新任务对象） */
export async function runTaskRound(task, hub) {
  const stat = await runTaskOnce(task, hub)
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
  return { stat, task: row ? mapTask(row) : null }
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
