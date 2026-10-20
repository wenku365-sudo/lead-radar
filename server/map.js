import { INDUSTRIES } from '../src/data/mock.js'

export const PLATFORM_LABEL = { douyin: '抖音', xhs: '小红书' }
export const LABEL_PLATFORM = { 抖音: 'douyin', 小红书: 'xhs' }

export const IND_BY_KEY = Object.fromEntries(INDUSTRIES.map((i) => [i.key, i]))

/** DB 行 → 前端 customer 形状（与 mock.js 的客户对象保持一致，页面零改动） */
export function mapLead(row) {
  const ind = IND_BY_KEY[row.industry_key]
  return {
    id: row.id,
    nick: row.nick,
    avatarColor: row.avatar_color || '#5b5bd6',
    platform: PLATFORM_LABEL[row.platform] || row.platform,
    industry: ind ? ind.name : row.industry_key,
    industryKey: row.industry_key,
    comment: row.comment,
    score: row.score,
    level: row.level,
    time: relTime(row.created_at),
    today: isToday(row.created_at),
    srcVideo: row.video_title,
    srcAuthor: row.video_author,
    likes: row.likes,
    tags: safeJSON(row.tags, []),
    followed: !!row.followed,
    later: !!row.later,
    followStatus: row.follow_status || 'todo',
    note: row.note || '',
    scoredBy: row.scored_by
  }
}

/** DB 任务行 → 前端任务形状 */
export function mapTask(row) {
  const ind = IND_BY_KEY[row.industry_key]
  return {
    id: 't' + row.id,
    dbId: row.id,
    title: row.title,
    industry: ind ? ind.name : '',
    industryKey: row.industry_key,
    emoji: row.emoji,
    desc: row.desc,
    keywords: safeJSON(row.keywords, []),
    videos: row.videos_found,
    customers: row.customers_found,
    lastRun: row.last_run_at ? relTime(row.last_run_at) : '未运行',
    status: row.status
  }
}

export function relTime(iso) {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 172800) return '昨天'
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
  if (diff < 2592000) return `${Math.floor(diff / 604800)} 周前`
  return `${Math.floor(diff / 2592000)} 个月前`
}

export function isToday(iso) {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export function safeJSON(text, fallback) {
  try { return JSON.parse(text) } catch { return fallback }
}

/** sqlite datetime('now') 是 UTC，这里统一用 ISO 本地可读格式 */
export function nowISO() {
  return new Date().toISOString()
}
