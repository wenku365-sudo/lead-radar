/**
 * 抖音数据源适配器（真实 HTTP 通道）。
 *
 * 抖音官方开放平台不提供「搜索任意对标视频 + 拉取竞品评论」的公开 API，
 * 因此本适配器采用「可配置上游」设计：指向任何一个你**有权限使用**的数据通道，例如：
 *   1. 抖音开放平台（自有授权账号的视频/评论管理接口，自行封装成下述约定格式）
 *   2. 合规第三方数据服务商 API（蝉妈妈 / 新抖 / 飞瓜等付费接口，同样封装成约定格式）
 *   3. 自建采集网关（由你在自有服务器上实现，输出下述约定格式）
 *
 * 环境变量：
 *   LR_DOUYIN_API_BASE   —— 上游基地址，如 https://gw.example.com/douyin（必填才启用）
 *   LR_DOUYIN_API_KEY    —— Bearer Token（可选）
 *   LR_DOUYIN_SEARCH_PATH  —— 搜索视频路径，默认 /search/videos
 *   LR_DOUYIN_COMMENTS_PATH —— 拉取评论路径，默认 /comments
 *
 * 上游约定格式（字段名做了弹性映射，兼容常见命名）：
 *   GET {base}{searchPath}?keyword=xxx&count=10
 *     → { "videos": [ { "id", "title", "author", "likes", "comments" } ] }
 *   GET {base}{commentsPath}?video_id=xxx&count=50
 *     → { "comments": [ { "cid", "text", "likes", "user": { "nickname", "avatar" } } ] }
 *
 * 未配置 LR_DOUYIN_API_BASE 时 worker 自动回退 mock 适配器，系统仍完整可跑。
 */
const BASE = (process.env.LR_DOUYIN_API_BASE || '').replace(/\/$/, '')
const KEY = process.env.LR_DOUYIN_API_KEY || ''
const SEARCH_PATH = process.env.LR_DOUYIN_SEARCH_PATH || '/search/videos'
const COMMENTS_PATH = process.env.LR_DOUYIN_COMMENTS_PATH || '/comments'
const TIMEOUT_MS = Number(process.env.LR_DOUYIN_TIMEOUT_MS || 15000)

export const douyinHttpEnabled = !!BASE

async function getJSON(pathname, params) {
  const qs = new URLSearchParams(params)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${pathname}?${qs}`, {
      headers: { Accept: 'application/json', ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}) },
      signal: ctrl.signal
    })
    if (!res.ok) throw new Error(`上游 HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** 弹性取数组：兼容 {videos:[..]} / {data:{videos:[..]}} / {data:[..]} / [..] */
function pickList(payload, key) {
  if (Array.isArray(payload)) return payload
  const d = payload?.data
  if (Array.isArray(d)) return d
  const nested = d && (d[key] || d.list || d.items)
  if (Array.isArray(nested)) return nested
  const top = payload?.[key] || payload?.list || payload?.items
  return Array.isArray(top) ? top : []
}

/** 抖音头像 URL → 稳定颜色（前端用色块代替外链头像） */
function colorFromNick(s) {
  const colors = ['#5b5bd6', '#d6455b', '#1d9e75', '#e8833a', '#7f77dd', '#993556', '#185fa5', '#854f0b']
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

/**
 * 按搜索关键词找对标视频。
 * @param {object} params { keywords: string[], count?: number }
 * @returns {Promise<Array<{platform, platformVideoId, title, author, likes, comments}>>}
 */
export async function searchVideos(params) {
  const keywords = params.keywords || []
  const count = params.count || 10
  const out = []
  // 每个关键词各搜一页，合并去重
  for (const kw of keywords.slice(0, 5)) {
    const payload = await getJSON(SEARCH_PATH, { keyword: kw, count })
    for (const v of pickList(payload, 'videos')) {
      const id = String(v.id ?? v.video_id ?? v.aweme_id ?? v.title)
      const title = String(v.title ?? v.name ?? v.desc ?? '未命名视频')
      if (out.some((x) => x.platformVideoId === id)) continue
      out.push({
        platform: 'douyin',
        platformVideoId: id,
        title,
        author: String(v.author ?? v.nickname ?? v.author_name ?? '未知作者'),
        likes: Number(v.likes ?? v.digg_count ?? v.like_count ?? 0) || 0,
        comments: Number(v.comments ?? v.comment_count ?? 0) || 0
      })
    }
  }
  return out
}

/**
 * 拉取单个视频的评论。
 * @returns {Promise<Array<{platform, platformCommentId, nick, avatarColor, comment, videoTitle, videoAuthor, likes}>>}
 */
export async function fetchComments(video, params = {}) {
  const count = params.count || 50
  const payload = await getJSON(COMMENTS_PATH, { video_id: video.platformVideoId, count })
  return pickList(payload, 'comments')
    .map((c) => {
      const nick = String(
        c.user?.nickname || c.user?.name || c.nick || c.nickname || c.user_name || '匿名用户'
      )
      return {
        platform: 'douyin',
        platformCommentId: String(c.cid ?? c.id ?? c.comment_id ?? `${video.platformVideoId}-${nick}`),
        nick,
        avatarColor: colorFromNick(nick),
        comment: String(c.text ?? c.content ?? c.comment ?? '').trim(),
        videoTitle: video.title,
        videoAuthor: video.author,
        likes: Number(c.likes ?? c.digg_count ?? c.like_count ?? 0) || 0
      }
    })
    .filter((c) => c.comment)
}

export const douyinHttpAdapter = {
  name: 'douyin-http',
  searchVideos,
  fetchComments
}
