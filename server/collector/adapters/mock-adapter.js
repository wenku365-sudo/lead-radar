/**
 * 平台适配器（Mock）：模拟"已授权账号"的评论流入。
 *
 * 真实接入时新建 adapters/douyin-open.js、adapters/xhs-pro.js，
 * 实现同样的 fetchNewComments(task, accounts) 接口并在 adapters/index.js 注册，
 * 其余代码（打分/去重/推送/落库）零改动。
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

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 每次轮询：60% 概率产生 1-3 条新评论，模拟真实评论节奏 */
export function fetchNewComments(task, accounts) {
  if (Math.random() > 0.6) return []
  const ind = IND_BY_KEY[task.industry_key] || INDUSTRIES[0]
  const platforms = accounts.length ? accounts.map((a) => a.platform) : ['douyin', 'xhs']
  const n = 1 + Math.floor(Math.random() * 3)
  const out = []
  for (let i = 0; i < n; i++) {
    const platform = pick(platforms)
    const video = ind.videos[Math.floor(Math.random() * ind.videos.length)]
    out.push({
      platform,
      platformCommentId: `mock-${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nick: pick(NICKS) + (Math.random() < 0.35 ? '_' + (10 + Math.floor(Math.random() * 90)) : ''),
      avatarColor: pick(COLORS),
      comment: ind.comments[Math.floor(Math.random() * ind.comments.length)],
      videoTitle: video.title,
      videoAuthor: video.author,
      likes: Math.floor(Math.random() * 220)
    })
  }
  return out
}

/** 适配器注册表：worker 按账号的 adapter 字段取对应实现 */
export const ADAPTERS = { mock: { fetchNewComments } }
