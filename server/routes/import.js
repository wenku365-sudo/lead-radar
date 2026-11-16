/**
 * 数据接入路由：
 *   GET  /api/data-source   当前数据源状态（mock / 真实 HTTP 通道）
 *   POST /api/leads/import  批量导入真实评论，走与自动采集完全一致的管线
 *                           （匹配词过滤 → 打分 → 去重落库 → WebSocket 推送）
 *
 * 导入格式（二选一或混用）：
 *   comments: [{ nick, text, commentId?, likes? }]          结构化
 *   lines:    ["昵称 | 评论内容", "评论内容", ...]             粘贴文本（从抖音复制的评论）
 * 附带 video: { title, author, videoId? } 描述这些评论的来源视频。
 */
import { Router } from 'express'
import { db } from '../db.js'
import { mapLead, nowISO } from '../map.js'
import { dataSourceInfo } from '../collector/adapters/index.js'
import { hitMatchWords, taskMatchWords } from '../collector/worker.js'
import { scoreLead } from '../llm/provider.js'

const router = Router()

router.get('/data-source', (req, res) => {
  res.json({ ok: true, source: dataSourceInfo() })
})

router.post('/leads/import', async (req, res) => {
  const { taskId, video = {}, comments = [], lines = [], matchWords: customMatchWords } = req.body || {}
  const uid = req.user.id

  // 目标任务：指定 taskId 用之；否则找该用户最新的 running 任务；都无则报错
  let task = null
  if (taskId) task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, uid)
  if (!task) task = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND status = 'running' ORDER BY id DESC").get(uid)
  if (!task) return res.status(400).json({ error: '没有运行中的任务，请先创建任务，或传 taskId 指定目标任务' })

  const matchWords = normalizeWords(
    customMatchWords?.length ? customMatchWords : taskMatchWords(task)
  )

  // lines → comments 解析：支持「昵称 | 评论」「昵称: 评论」或纯评论
  const fromLines = lines.map((line, i) => {
    const s = String(line).trim()
    if (!s) return null
    const m = s.match(/^(.{1,30}?)\s*[|｜::]\s*(.+)$/)
    return m ? { nick: m[1], text: m[2] } : { nick: `用户${i + 1}`, text: s }
  }).filter(Boolean)

  const all = [...comments, ...fromLines]
  if (!all.length) return res.status(400).json({ error: '没有可导入的评论：请传 comments 数组或 lines 文本行' })

  const videoTitle = video.title || '手工导入的对标视频'
  const videoAuthor = video.author || '未知作者'
  const videoId = video.videoId || `import-${uid}-${Date.now()}`

  let scanned = 0
  let matched = 0
  let added = 0
  const inserted = []
  const hub = req.app.get('hub')

  db.prepare(
    'INSERT OR IGNORE INTO videos (user_id, platform, platform_video_id, title, author) VALUES (?, ?, ?, ?, ?)'
  ).run(uid, 'douyin', videoId, videoTitle, videoAuthor)

  for (const c of all) {
    const text = String(c.text || c.comment || '').trim()
    if (!text) continue
    scanned++
    if (!hitMatchWords(text, matchWords)) continue
    matched++

    const { score, level, tags, source } = await scoreLead(text, task.industry_key)
    const nick = String(c.nick || c.nickname || '匿名用户').slice(0, 50)
    const platformCommentId = String(c.commentId || c.cid || `import-${videoId}-${scanned}`)
    const info = db
      .prepare(
        `INSERT OR IGNORE INTO leads
         (user_id, task_id, platform, platform_comment_id, nick, avatar_color, industry_key,
          comment, score, level, tags, video_title, video_author, likes, scored_by, created_at)
         VALUES (?, ?, 'douyin', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        uid, task.id, platformCommentId, nick, colorFromNick(nick), task.industry_key,
        text, score, level, JSON.stringify(tags || []), videoTitle, videoAuthor,
        Number(c.likes || 0) || 0, source, nowISO()
      )
    if (info.changes > 0) {
      added++
      const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(info.lastInsertRowid)
      const lead = mapLead(row)
      inserted.push(lead)
      if (hub) hub.broadcast(uid, { type: 'lead:new', lead })
    }
  }

  db.prepare(
    'UPDATE tasks SET last_run_at = ?, videos_found = videos_found + ?, customers_found = customers_found + ? WHERE id = ?'
  ).run(nowISO(), added ? 1 : 0, added, task.id)

  res.json({
    ok: true,
    taskId: task.id,
    taskTitle: task.title,
    matchWords,
    total: scanned,
    matched,
    added,
    leads: inserted.slice(0, 50)
  })
})

function normalizeWords(list) {
  if (!Array.isArray(list)) return []
  return [...new Set(list.map((w) => String(w).trim()).filter(Boolean))]
}

function colorFromNick(s) {
  const colors = ['#5b5bd6', '#d6455b', '#1d9e75', '#e8833a', '#7f77dd', '#993556', '#185fa5', '#854f0b']
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

export default router
