/**
 * 仿真抖音页面：搜索 + 视频详情 + 评论区。
 *
 * 用途：为「浏览器自动化采集适配器」提供演示目标页 —— 真实浏览器在本地页面上
 * 完成 搜索关键词 → 浏览视频 → 提取评论 的完整自动化流程，不触碰真实抖音。
 *
 * 挂载：GET /sim       页面（SPA，hash 路由）
 *      GET /sim/data   数据（由 mock.js 行业语料确定性生成）
 */
import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { INDUSTRIES, TASK_TEMPLATES } from '../../../src/data/mock.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

/* ---------------- 确定性数据生成 ---------------- */

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NICKS = [
  '柚子茶', '阿Ken', '小满不吃香菜', 'Nana', '山野少年', '桃桃乌龙', '老王爱折腾', 'Momo酱',
  '大城小爱', '一颗圆白菜', '阿杰Jie', '糖糖妈', '深夜食堂常客', 'Nick', '叶子轻轻飘',
  '不吃香菜星人', '半糖去冰', '阿蛮', 'Kiko', '搬砖小张', '林间有风', '一只咕咕鸡'
]
const CHATTER = [
  '哈哈哈哈哈笑死了', '已三连', '前排围观', '拍得真好', '收藏了慢慢看',
  'UP主有心了', 'bgm叫什么？', '每天来看一遍', '太真实了', '蹲一个后续'
]

/** 生成全部仿真视频（含评论区） */
export function buildSimData() {
  // 时间桶：每 5 分钟滚动一批"新评论"（cid 含桶号 → 跨桶出现新线索，桶内稳定去重）
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000))
  const videos = []
  for (const ind of INDUSTRIES) {
    // 「含匹配词」的评论池：这类评论命中任务的匹配词才算意向线索。
    // 每条视频固定从中产出 19-29 条意向评论（3 条视频 + 时间桶新评论 ≈ 60-96 条），
    // 保证每个任务每轮采集到的线索量稳定落在 50-100 区间
    const tpl = TASK_TEMPLATES.find((t) => t.ind === ind.key)
    const words = [...new Set([...ind.keywords, ...(tpl ? tpl.focus : [])])]
    const kwPool = ind.comments.filter((c) => words.some((w) => c.includes(w)))
    const pool = kwPool.length >= 6 ? kwPool : ind.comments

    ind.videos.forEach((v, vi) => {
      const vid = `sim-${ind.key}-${vi}`
      const rnd = mulberry32(hashStr(vid))
      const comments = []
      const pushKw = (cid, r, likeMax) => ({
        cid,
        nick: NICKS[Math.floor(r() * NICKS.length)] + (r() < 0.7 ? '_' + (10 + Math.floor(r() * 90)) : ''),
        text: pool[Math.floor(r() * pool.length)],
        likes: Math.floor(r() * likeMax)
      })
      // 稳定的存量意向评论：19-29 条（含匹配词）
      const n = 19 + Math.floor(rnd() * 11)
      for (let i = 0; i < n; i++) comments.push(pushKw(`${vid}-c-${i}`, rnd, 300))
      // 闲聊评论：4-6 条，让评论区看起来更真实（不命中匹配词，只计入扫描量）
      const m = 4 + Math.floor(rnd() * 3)
      for (let i = 0; i < m; i++) {
        comments.push({
          cid: `${vid}-x-${i}`,
          nick: NICKS[Math.floor(rnd() * NICKS.length)],
          text: CHATTER[Math.floor(rnd() * CHATTER.length)],
          likes: Math.floor(rnd() * 60)
        })
      }
      // 时间桶新评论：3 条意向（含匹配词），模拟"不断有新评论进来"
      const frnd = mulberry32(hashStr(vid + '-' + bucket))
      for (let i = 0; i < 3; i++) comments.push(pushKw(`${vid}-f-${bucket}-${i}`, frnd, 50))
      // 意向与闲聊交错排列
      for (let i = comments.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        ;[comments[i], comments[j]] = [comments[j], comments[i]]
      }
      videos.push({
        id: vid,
        title: v.title,
        author: v.author,
        likes: v.likes || Math.floor(rnd() * 100000),
        cmts: comments.length,
        kws: [ind.searchWord, ...(ind.searches || []), ...ind.keywords], // 供搜索匹配
        comments
      })
    })
  }
  return { videos }
}

/* ---------------- 路由 ---------------- */

router.get('/sim/data', (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.json(buildSimData())
})

router.get('/sim', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8'))
})

export default router
