import { Router } from 'express'
import { db } from '../db.js'
import { IND_BY_KEY } from '../map.js'
import { INDUSTRIES } from '../../src/data/mock.js'

const router = Router()

/** 工作台统计：总量 / 今日新增 / 均分 / 待跟进 / 行业分布 / 转化漏斗 / 等级分布 */
router.get('/', (req, res) => {
  const uid = req.user.id

  const total = db.prepare('SELECT COUNT(*) AS n FROM leads WHERE user_id = ?').get(uid).n
  const todayRow = db.prepare(
    "SELECT COUNT(*) AS n FROM leads WHERE user_id = ? AND date(created_at) = date('now')"
  ).get(uid)
  const avgRow = db.prepare('SELECT AVG(score) AS s FROM leads WHERE user_id = ?').get(uid)
  const pending = db.prepare(
    "SELECT COUNT(*) AS n FROM leads WHERE user_id = ? AND follow_status = 'todo'"
  ).get(uid).n

  const byStatus = Object.fromEntries(
    db
      .prepare('SELECT follow_status AS k, COUNT(*) AS n FROM leads WHERE user_id = ? GROUP BY follow_status')
      .all(uid)
      .map((r) => [r.k, r.n])
  )

  const byIndustry = INDUSTRIES.map((ind) => {
    const n = db
      .prepare('SELECT COUNT(*) AS n FROM leads WHERE user_id = ? AND industry_key = ?')
      .get(uid, ind.key).n
    return { key: ind.key, name: ind.name, emoji: ind.emoji, count: n }
  })

  const byLevel = Object.fromEntries(
    db
      .prepare('SELECT level AS k, COUNT(*) AS n FROM leads WHERE user_id = ? GROUP BY level')
      .all(uid)
      .map((r) => [r.k, r.n])
  )

  const taskCount = db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id = ?').get(uid).n

  res.json({
    total,
    todayNew: todayRow.n,
    avgScore: Math.round(avgRow.s || 0),
    pending,
    taskCount,
    byStatus: {
      todo: byStatus.todo || 0,
      contacted: byStatus.contacted || 0,
      visited: byStatus.visited || 0,
      deal: byStatus.deal || 0
    },
    byIndustry,
    byLevel
  })
})

export default router
