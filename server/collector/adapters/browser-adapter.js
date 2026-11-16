/**
 * 浏览器自动化采集适配器（演示用，目标为本系统自带的仿真抖音页面 /sim）。
 *
 * 工作方式：Playwright 驱动真实浏览器 —— 打开页面 → 输入搜索关键词 → 读取搜索结果
 * → 逐个点开视频 → 提取评论区数据，全程真实 DOM 自动化，演示时浏览器可见可讲解。
 *
 * ⚠️ 本适配器指向本地仿真页面（LR_BROWSER_SOURCE_URL）。不要将其指向真实抖音等
 * 第三方平台：自动化抓取这些平台违反其服务条款，且涉及评论人个人信息合规风险。
 *
 * 环境变量：
 *   LR_COLLECTOR=browser            启用本适配器
 *   LR_BROWSER_SOURCE_URL           目标页面，默认 http://127.0.0.1:5190/sim
 *   LR_BROWSER_HEADLESS             默认 true；设为 false 可看到浏览器自动操作（演示推荐）
 *
 * 依赖：npm i playwright（复用系统 Chrome/Edge，无需下载浏览器内核）
 */
const SRC = (process.env.LR_BROWSER_SOURCE_URL || 'http://127.0.0.1:5190/sim').replace(/\/$/, '')
const HEADLESS = (process.env.LR_BROWSER_HEADLESS ?? 'true') !== 'false'

let _browser = null
let _pw = null

/** 懒加载 playwright + 启动浏览器（优先复用系统 Chrome/Edge，避免下载内核） */
async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser
  if (!_pw) {
    _pw = await import('playwright').catch(() => {
      throw new Error('未安装 playwright：请先在项目目录执行 npm i playwright')
    })
  }
  const channels = ['chrome', 'msedge', undefined] // undefined = 自带 chromium（需 npx playwright install）
  let lastErr
  for (const channel of channels) {
    try {
      _browser = await _pw.chromium.launch({ channel, headless: HEADLESS })
      console.log(`[browser] 已启动浏览器${channel ? '（channel: ' + channel + '）' : ''} · headless=${HEADLESS}`)
      return _browser
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error('浏览器启动失败（未找到 Chrome/Edge）：' + (lastErr?.message || ''))
}

/** 提取失败自动重试一次（演示页面偶发加载慢） */
async function withPage(fn) {
  const browser = await getBrowser()
  for (let attempt = 0; attempt < 2; attempt++) {
    const page = await browser.newPage()
    try {
      return await fn(page)
    } catch (e) {
      if (attempt === 1) throw e
      await new Promise((r) => setTimeout(r, 800))
    } finally {
      await page.close().catch(() => {})
    }
  }
}

function colorFromNick(s) {
  const colors = ['#5b5bd6', '#d6455b', '#1d9e75', '#e8833a', '#7f77dd', '#993556', '#185fa5', '#854f0b']
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

/**
 * 搜索对标视频：打开页面 → 输入关键词 → 点搜索 → 读结果卡片。
 * @param {object} params { keywords: string[], industryKey?: string }
 */
export async function searchVideos({ keywords = [], industryKey } = {}) {
  const out = []
  for (const kw of keywords.slice(0, 3)) {
    let cards = []
    try {
      cards = await withPage(async (page) => {
        await page.goto(SRC, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.fill('#kw', kw)
        await page.click('#search-btn')
        // 有结果等结果卡片，无结果等空态提示（不因某关键词搜不到而中断整轮）
        await page.waitForSelector('.video-card, .empty', { timeout: 10000 })
        // 滚动一屏，演示"浏览搜索结果"的过程
        await page.mouse.wheel(0, 600).catch(() => {})
        await page.waitForTimeout(300)
        return page.$$eval('.video-card', (els) =>
          els.map((e) => ({
            id: e.dataset.vid,
            title: e.dataset.title,
            author: e.dataset.author,
            likes: Number(e.dataset.likes) || 0,
            cmts: Number(e.dataset.cmts) || 0,
            href: e.dataset.href
          }))
        )
      })
    } catch (e) {
      console.warn(`[browser] 搜索「${kw}」失败：${e.message}`)
      continue
    }
    if (!cards.length) console.log(`[browser] 搜索「${kw}」无结果`)
    for (const c of cards) {
      if (!out.some((x) => x.platformVideoId === c.id)) {
        out.push({
          platform: 'douyin',
          platformVideoId: c.id,
          title: c.title,
          author: c.author,
          likes: c.likes,
          comments: c.cmts,
          href: SRC + '/' + c.href
        })
      }
    }
  }
  // 仿真页的视频 id 带行业前缀（sim-<industry>-<n>）：过滤跨行业串入的结果
  if (industryKey) {
    const own = out.filter(
      (v) => !String(v.platformVideoId).startsWith('sim-') || String(v.platformVideoId).startsWith(`sim-${industryKey}-`)
    )
    if (own.length) return own
  }
  return out
}

/**
 * 拉取单个视频的评论：打开视频页 → 滚动评论区 → 逐条提取。
 */
export async function fetchComments(video) {
  const url = video.href || `${SRC}/#/video/${video.platformVideoId}`
  const list = await withPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForSelector('.comment-item', { timeout: 10000 })
    await page.mouse.wheel(0, 1200).catch(() => {})
    await page.waitForTimeout(300)
    return page.$$eval('.comment-item', (els) =>
      els.map((e) => ({
        platformCommentId: e.dataset.cid,
        nick: e.dataset.nick,
        text: e.dataset.text,
        likes: Number(e.dataset.likes) || 0
      }))
    )
  })
  return list
    .filter((c) => c.text && c.text.trim())
    .map((c) => ({
      platform: 'douyin',
      platformCommentId: c.platformCommentId,
      nick: c.nick,
      avatarColor: colorFromNick(c.nick),
      comment: c.text.trim(),
      videoTitle: video.title,
      videoAuthor: video.author,
      likes: c.likes
    }))
}

export function browserInfo() {
  return { sourceUrl: SRC, headless: HEADLESS }
}

export const browserAdapter = { name: 'browser', searchVideos, fetchComments }
