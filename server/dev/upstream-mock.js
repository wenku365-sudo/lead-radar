/**
 * 本地模拟上游数据服务商 API（开发调试用）。
 *
 * 用途：验证 douyin-http 适配器的真实 HTTP 链路（不碰抖音，纯本地假数据）。
 * 启动：node server/dev/upstream-mock.js  （默认端口 5199）
 * 接入：LR_DOUYIN_API_BASE=http://127.0.0.1:5199 node server/index.js
 *
 * 提供与适配器约定一致的接口：
 *   GET /search/videos?keyword=xxx&count=10 → { videos: [...] }
 *   GET /comments?video_id=xxx&count=50     → { comments: [...] }
 */
import http from 'node:http'

const PORT = Number(process.env.UPSTREAM_PORT || 5199)

const VIDEO_POOL = [
  { id: 'v-1001', title: '全屋定制避坑指南，看完少花冤枉钱', author: '家居老王说', likes: 128000, comments: 4200 },
  { id: 'v-1002', title: '5万块配齐全屋家具实测', author: '装修不踩坑', likes: 96000, comments: 3100 },
  { id: 'v-1003', title: '实木家具怎么选？老师傅三招教会你', author: '木匠阿峰', likes: 75000, comments: 2600 },
  { id: 'v-1004', title: '小户型定制柜这样设计才不亏', author: '设计师范范', likes: 54000, comments: 1900 }
]

// 意向评论（含匹配词）与闲聊评论混合，模拟真实评论区
const INTENT_COMMENTS = [
  '这套全屋定制怎么收费？最近正准备装修',
  '沙发多少钱一套？想要布艺的',
  '有没有优惠活动？双十一想入手',
  '坐标杭州，有线下门店吗？想去看看',
  '可以预约到店体验吗？周末有空',
  '预算3万能搞定全屋吗？求推荐',
  '儿童房家具推荐哪个牌子？要环保的',
  '定制衣柜价格怎么算的？',
  '床垫可以试躺吗？想预约过去',
  '包送货安装吗？另外收费吗'
]
const CHATTER_COMMENTS = [
  '哈哈哈哈太真实了', '已收藏', '拍得真好', 'bgm是什么歌', '每天来涨知识',
  '前排', 'UP主用心了', '蹲一个后续', '算法快推给需要的人', '泪目'
]
const NICKS = ['柚子茶', '阿Ken', '小满', 'Nana', '桃桃乌龙', 'Momo酱', '搬砖小张', 'Kiko', '糖糖妈', 'Bruce']

const rid = (n) => Math.floor(Math.random() * n)

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (url.pathname === '/search/videos') {
    const count = Math.min(Number(url.searchParams.get('count') || 10), VIDEO_POOL.length)
    const videos = [...VIDEO_POOL].sort(() => Math.random() - 0.5).slice(0, Math.max(2, count - 1))
    console.log(`[upstream] 搜索 "${url.searchParams.get('keyword')}" → ${videos.length} 条视频`)
    return res.end(JSON.stringify({ keyword: url.searchParams.get('keyword'), videos }))
  }

  if (url.pathname === '/comments') {
    const videoId = url.searchParams.get('video_id') || 'unknown'
    const video = VIDEO_POOL.find((v) => v.id === videoId) || VIDEO_POOL[rid(VIDEO_POOL.length)]
    const count = Number(url.searchParams.get('count') || 30)
    const comments = Array.from({ length: Math.min(count, 40) }, (_, i) => {
      const intent = Math.random() < 0.5
      const nick = NICKS[rid(NICKS.length)] + '_' + (10 + rid(90))
      return {
        cid: `${videoId}-c-${Date.now()}-${i}`,
        text: intent ? INTENT_COMMENTS[rid(INTENT_COMMENTS.length)] : CHATTER_COMMENTS[rid(CHATTER_COMMENTS.length)],
        likes: rid(500),
        user: { nickname: nick, avatar: '' }
      }
    })
    console.log(`[upstream] 视频 ${videoId}（${video.title}）→ ${comments.length} 条评论`)
    return res.end(JSON.stringify({ video_id: videoId, comments }))
  }

  res.statusCode = 404
  res.end(JSON.stringify({ error: 'not found' }))
})

server.listen(PORT, () => {
  console.log(`[upstream] 模拟上游数据服务已启动 → http://127.0.0.1:${PORT}`)
  console.log('[upstream] 接入方式：LR_DOUYIN_API_BASE=http://127.0.0.1:' + PORT + ' node server/index.js')
})
