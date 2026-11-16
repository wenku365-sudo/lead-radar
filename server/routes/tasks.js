import { Router } from 'express'
import { db } from '../db.js'
import { mapTask, nowISO } from '../map.js'
import { understandTask, INDUSTRIES, registerIndustry } from '../../src/data/mock.js'
import { synthIndustry } from '../../src/data/industry-synth.js'
import { persistIndustry } from '../industry-store.js'
import { runTaskRound } from '../collector/worker.js'

const router = Router()

/** 任务列表 */
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC').all(req.user.id)
  res.json({ tasks: rows.map(mapTask) })
})

/** AI 解析任务（不落库）—— 对应前端「生成任务」按钮 */
router.post('/parse', (req, res) => {
  const input = (req.body?.input || '').trim()
  if (!input) return res.status(400).json({ error: '请输入任务描述' })
  const parsed = understandTask(input)
  persistIndustry(parsed.industryKey) // 动态行业落库，重启后仍可解析
  res.json({ parsed })
})

/** 创建任务（可携带已解析结果）—— 对应「开始采集这项任务」 */
router.post('/', (req, res) => {
  const input = (req.body?.input || '').trim()
  if (!input) return res.status(400).json({ error: '请输入任务描述' })
  const parsed = req.body?.parsed || understandTask(input)
  let ind =
    INDUSTRIES.find((i) => i.key === parsed.industryKey) ||
    INDUSTRIES.find((i) => i.name === parsed.industryName)
  // 客户端传来的动态行业在服务端还没注册过：按原话重新合成，保证行业信息完整
  if (!ind && parsed.generated) {
    ind = registerIndustry(synthIndustry(input))
    parsed.industryKey = ind.key
    parsed.industryName = ind.name
    parsed.emoji = parsed.emoji || ind.emoji
  }
  persistIndustry(ind?.key)
  const searchKeywords = normalizeWords(
    req.body?.searchKeywords || parsed.searchKeywords || (ind ? [ind.searchWord] : [])
  )
  const matchWords = normalizeWords(req.body?.matchWords || parsed.matchWords || parsed.focus || [])
  const info = db
    .prepare(
      `INSERT INTO tasks (user_id, title, industry_key, emoji, desc, keywords, search_keywords, match_words, platforms, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'running')`
    )
    .run(
      req.user.id,
      input,
      ind ? ind.key : null,
      parsed.emoji || '🎯',
      req.body?.desc || `${parsed.industries.join(' + ')}公开视频 · 识别购买意向信号`,
      JSON.stringify(parsed.focus || []),
      JSON.stringify(searchKeywords),
      JSON.stringify(matchWords),
      JSON.stringify(['douyin', 'xhs'])
    )
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid)
  res.json({ task: mapTask(row), parsed })
})

/** 关键词归一化：去空、去重、限长 */
function normalizeWords(list) {
  if (!Array.isArray(list)) return []
  return [...new Set(list.map((w) => String(w).trim()).filter(Boolean))].slice(0, 30)
}

/** 手动触发一轮采集（对应「立即采集」） */
router.post('/:id/run', async (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: '任务不存在' })
  const { stat, task } = await runTaskRound(row, req.app.get('hub'))
  res.json({ ok: true, ...stat, task })
})

/** 暂停 / 恢复 */
router.patch('/:id', (req, res) => {
  const { status } = req.body || {}
  if (!['running', 'paused', 'done'].includes(status)) {
    return res.status(400).json({ error: 'status 取值：running / paused / done' })
  }
  const info = db
    .prepare('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?')
    .run(status, req.params.id, req.user.id)
  if (!info.changes) return res.status(404).json({ error: '任务不存在' })
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  res.json({ task: mapTask(row) })
})

export default router
