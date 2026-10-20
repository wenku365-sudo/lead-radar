import { Router } from 'express'
import { db } from '../db.js'
import { mapTask, nowISO } from '../map.js'
import { understandTask, INDUSTRIES } from '../../src/data/mock.js'
import { runTaskOnce } from '../collector/worker.js'

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
  res.json({ parsed: understandTask(input) })
})

/** 创建任务（可携带已解析结果）—— 对应「开始采集这项任务」 */
router.post('/', (req, res) => {
  const input = (req.body?.input || '').trim()
  if (!input) return res.status(400).json({ error: '请输入任务描述' })
  const parsed = req.body?.parsed || understandTask(input)
  const ind = INDUSTRIES.find((i) => i.name === parsed.industryName)
  const info = db
    .prepare(
      `INSERT INTO tasks (user_id, title, industry_key, emoji, desc, keywords, platforms, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'running')`
    )
    .run(
      req.user.id,
      input,
      ind ? ind.key : null,
      parsed.emoji || '🎯',
      req.body?.desc || `${parsed.industries.join(' + ')}公开视频 · 识别购买意向信号`,
      JSON.stringify(parsed.focus || []),
      JSON.stringify(['douyin', 'xhs'])
    )
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid)
  res.json({ task: mapTask(row), parsed })
})

/** 手动触发一轮采集（对应「立即采集」） */
router.post('/:id/run', async (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: '任务不存在' })
  const n = await runTaskOnce(row, req.app.get('hub'))
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(row.id)
  res.json({ ok: true, newLeads: n, task: mapTask(updated) })
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
