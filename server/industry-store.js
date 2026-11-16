/**
 * 动态行业持久化：把运行时合成的行业写入 DB，重启后恢复到内存注册表。
 * 这样历史任务和线索里的 industry_key（dyn-xxx）不会失效。
 */
import { db } from './db.js'
import { INDUSTRY_MAP, registerIndustry } from '../src/data/mock.js'

/** 启动时加载全部已合成行业 */
export function loadGeneratedIndustries() {
  const rows = db.prepare('SELECT key, data FROM industries').all()
  let ok = 0
  for (const r of rows) {
    try {
      const ind = JSON.parse(r.data)
      ind.key = r.key
      registerIndustry(ind)
      ok++
    } catch (e) {
      console.warn('[industry] 恢复失败:', r.key, e.message)
    }
  }
  if (ok) console.log(`[industry] 已恢复 ${ok} 个实时合成行业`)
  return ok
}

/** 持久化一个行业（仅动态生成的需要落库） */
export function persistIndustry(key) {
  const ind = INDUSTRY_MAP[key]
  if (!ind || !ind.generated) return false
  db.prepare(
    `INSERT INTO industries (key, data) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET data = excluded.data`
  ).run(key, JSON.stringify(ind))
  return true
}
