/**
 * 平台适配器（Mock）：模拟"搜索对标视频 → 拉取评论"的真实采集节奏。
 *
 * 接口契约（真实适配器同样实现这两个方法，其余代码零改动）：
 *   searchVideos({ keywords, count })  → [{ platform, platformVideoId, title, author, likes, comments }]
 *   fetchComments(video, { count })    → [{ platform, platformCommentId, nick, avatarColor, comment, videoTitle, videoAuthor, likes }]
 *
 * 评论刻意混入普通闲聊，让"匹配词过滤"环节有真实的通过率。
 */
import { INDUSTRIES } from '../../../src/data/mock.js'
import { IND_BY_KEY } from '../../map.js'

const NICKS = [
  '柚子茶', '阿Ken', '小满不吃香菜', 'Nana', '山野少年', '桃桃乌龙', '老王爱折腾', 'Momo酱',
  '大城小爱', '一颗圆白菜', '阿杰Jie', '糖糖妈', '深夜食堂常客', 'Nick', '叶子轻轻飘',
  '不吃香菜星人', '半糖去冰', '阿蛮', 'Kiko', '搬砖小张', '林间有风', '一只咕咕鸡',
  '大力娇', '阿汤哥不喝汤', '雪梨Pearl', '晨晨晨', '橘子汽水', '面壁者', '月半弯',
  '早睡冠军', '阿拉斯加的狗', '橙子妈妈', 'Bruce', '豆腐脑甜党', '南方小土豆'
]

const COLORS = ['#5b5bd6', '#d6455b', '#1d9e75', '#e8833a', '#7f77dd', '#993556', '#185fa5', '#854f0b']

// 普通闲聊评论（不含购买意向，会被匹配词过滤掉）
const CHATTER = [
  '哈哈哈哈哈笑死了', '已三连', '前排围观', '拍得真好', '收藏了慢慢看',
  'UP主有心了', '这就是生活啊', 'bgm叫什么？', '每天来看一遍', '太真实了',
  '蹲一个后续', '泪目', '算法快推', '第一！', '沙发'
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 未知行业（如「综合需求」任务）时，从全部行业池里随机取材，避免错标成某个固定行业 */
function pickIndustry(industryKey) {
  return IND_BY_KEY[industryKey] || INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)]
}

/** 搜索对标视频：按任务行业返回视频池（每轮 1-3 条，贴近真实节奏） */
export function searchVideos({ keywords = [], industryKey } = {}) {
  const ind = pickIndustry(industryKey)
  const out = []
  const n = 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    const v = ind.videos[Math.floor(Math.random() * ind.videos.length)]
    out.push({
      platform: 'douyin',
      platformVideoId: `mock-v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      industryKey: ind.key, // 记住本条视频取材的行业，取评论时保持一致
      title: v.title,
      author: v.author,
      likes: v.likes || 0,
      comments: v.cmts || 0
    })
  }
  return out
}

/** 拉取单个视频的评论：混有意向评论（来自行业语料）与闲聊评论 */
export function fetchComments(video, { industryKey } = {}) {
  const ind = IND_BY_KEY[video.industryKey] || pickIndustry(industryKey)
  const n = 2 + Math.floor(Math.random() * 4) // 每个视频 2-5 条
  const out = []
  for (let i = 0; i < n; i++) {
    // 约 45% 是意向评论，其余是闲聊（体现匹配词过滤的真实通过率）
    const isIntent = Math.random() < 0.45
    const nick = pick(NICKS) + (Math.random() < 0.35 ? '_' + (10 + Math.floor(Math.random() * 90)) : '')
    out.push({
      platform: 'douyin',
      platformCommentId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nick,
      avatarColor: pick(COLORS),
      comment: isIntent ? ind.comments[Math.floor(Math.random() * ind.comments.length)] : pick(CHATTER),
      videoTitle: video.title,
      videoAuthor: video.author,
      likes: Math.floor(Math.random() * 220)
    })
  }
  return out
}

export const mockAdapter = { name: 'mock', searchVideos, fetchComments }
