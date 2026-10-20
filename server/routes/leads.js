import { Router } from 'express'
import { db } from '../db.js'
import { mapLead, LABEL_PLATFORM, nowISO } from '../map.js'
import { generateReplies } from '../../src/data/mock.js'
import { repliesFor } from '../llm/provider.js'

const router = Router()

/**
 * 线索列表：支持 industry / platform / level / follow / q 筛选与分页。
 * 平台参数兼容 douyin|xhs 与 抖音|小红书 两种写法。
 */
router.get('/', (req, res) => {
  const { industry, platform, level, follow, q, limit, offset } = req.query
  const where = ['user_id = @uid']
  const params = { uid: req.user.id }

  if (industry && industry !== 'all') {
    where.push('industry_key = @industry')
    params.industry = industry
  }
  if (platform && platform !== 'all') {
    where.push('platform = @platform')
    params.platform = LABEL_PLATFORM[platform] || platform
  }
  if (level && level !== 'all') {
    where.push('level = @level')
    params.level = level
  }
  if (follow && follow !== 'all') {
    where.push('follow_status = @follow')
    params.follow = follow
  }
  if (q) {
    where.push("(comment LIKE '%' || @q || '%' OR nick LIKE '%' || @q || '%')")
    params.q = String(q)
  }

  const whereSQL = where.join(' AND ')
  const total = db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE ${whereSQL}`).get(params).n
  const rows = db
    .prepare(`SELECT * FROM leads WHERE ${whereSQL} ORDER BY id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: Math.min(Number(limit) || 500, 2000), offset: Number(offset) || 0 })

  res.json({ total, leads: rows.map(mapLead) })
})

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: '线索不存在' })
  const logs = db
    .prepare('SELECT * FROM follow_logs WHERE lead_id = ? ORDER BY id DESC LIMIT 50')
    .all(row.id)
  res.json({ lead: mapLead(row), logs })
})

/** 更新跟进状态 / 稍后跟进 / 备注 */
router.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: '线索不存在' })

  const { followStatus, followed, later, note } = req.body || {}
  const sets = []
  const params = { id: row.id }

  if (typeof followStatus === 'string') {
    if (!['todo', 'contacted', 'visited', 'deal'].includes(followStatus)) {
      return res.status(400).json({ error: 'followStatus 取值：todo / contacted / visited / deal' })
    }
    sets.push('follow_status = @followStatus')
    params.followStatus = followStatus
    if (followStatus !== 'todo') {
      sets.push('followed = 1')
    } else {
      sets.push('followed = 0')
    }
  }
  if (typeof followed === 'boolean') {
    sets.push('followed = @followed')
    params.followed = followed ? 1 : 0
    if (followed) sets.push("follow_status = CASE WHEN follow_status = 'todo' THEN 'contacted' ELSE follow_status END")
  }
  if (typeof later === 'boolean') {
    sets.push('later = @later')
    params.later = later ? 1 : 0
  }
  if (typeof note === 'string') {
    sets.push('note = @note')
    params.note = note
  }
  if (!sets.length) return res.status(400).json({ error: '无可更新字段' })

  db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = @id`).run(params)

  // 记录跟进流水
  if (typeof followStatus === 'string' && followStatus !== row.follow_status) {
    db.prepare(
      'INSERT INTO follow_logs (lead_id, user_id, action, from_status, to_status, note) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(row.id, req.user.id, 'status', row.follow_status, followStatus, note !== undefined ? note : null)
  }
  if (typeof note === 'string' && note !== (row.note || '')) {
    db.prepare('INSERT INTO follow_logs (lead_id, user_id, action, note) VALUES (?, ?, ?, ?)').run(
      row.id, req.user.id, 'note', note
    )
  }

  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(row.id)
  res.json({ lead: mapLead(updated) })
})

/** AI 推荐回复话术：LLM 可用时走大模型，否则规则模板 */
router.post('/:id/replies', async (req, res) => {
  const row = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: '线索不存在' })
  const lead = mapLead(row)
  try {
    const replies = await repliesFor(lead)
    res.json({ replies, source: replies[0]?.source || 'rules' })
  } catch (e) {
    // 兜底：规则模板
    res.json({ replies: generateReplies(lead).map((r) => ({ ...r, source: 'rules' })), source: 'rules' })
  }
})

export default router
