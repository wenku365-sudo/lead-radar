/**
 * LLM Provider：OpenAI 兼容接口 + 规则引擎降级。
 *
 * 环境变量：
 *   LLM_API_KEY  / OPENAI_API_KEY  —— 填了就走大模型
 *   LLM_BASE_URL                  —— 默认 https://api.openai.com/v1（可指向任意兼容网关）
 *   LLM_MODEL                     —— 默认 gpt-4o-mini
 *
 * 未配置 key 时自动降级为关键词规则引擎（复用前端 mock.js 的同一套语义），
 * 系统在无外部依赖的情况下依然完整可跑。
 */
const API_KEY = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || ''
const BASE_URL = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini'

export const llmEnabled = !!API_KEY

async function chatJSON(system, user) {
  if (!llmEnabled) throw new Error('LLM_DISABLED')
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      response_format: { type: 'json_object' }
    })
  })
  if (!res.ok) throw new Error(`LLM_HTTP_${res.status}`)
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''
  return JSON.parse(text)
}

/* ---------------- 规则引擎（降级方案，与前端 mock 同源） ---------------- */

import { KEYWORDS } from '../../src/data/mock.js'
import { IND_BY_KEY } from '../map.js'

export function rulesScore(comment, industryKey) {
  let hits = 0
  for (const kw of KEYWORDS) if (comment.includes(kw)) hits++
  const score = Math.min(98, 52 + hits * 14)
  const level = score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low'
  const ind = IND_BY_KEY[industryKey]
  const tags = ind
    ? [ind.tags[hits % ind.tags.length], ind.tags[(hits + 2) % ind.tags.length]]
    : []
  return { score, level, tags }
}

/* ---------------- 对外能力 ---------------- */

/**
 * 意向打分：评论 → { score, level, tags, source }
 */
export async function scoreLead(comment, industryKey) {
  const ind = IND_BY_KEY[industryKey]
  if (llmEnabled) {
    try {
      const out = await chatJSON(
        '你是获客线索的意向评分引擎。根据评论内容判断发言者的购买意向强度，只输出 JSON：{"score": 0-100 整数, "level": "high"|"mid"|"low", "tags": ["2个中文标签"]}。high=80分以上（明确询问价格/报名/到店），mid=60-79（有兴趣但未行动），low=60以下（纯闲聊）。',
        `行业：${ind ? ind.name : '未知'}\n评论内容：${comment}`
      )
      const score = Math.max(0, Math.min(100, Math.round(Number(out.score) || 0)))
      const level = ['high', 'mid', 'low'].includes(out.level) ? out.level : score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low'
      const tags = Array.isArray(out.tags) ? out.tags.slice(0, 3).map(String) : []
      return { score, level, tags, source: 'llm' }
    } catch (e) {
      console.warn('[llm] scoreLead 降级到规则引擎:', e.message)
    }
  }
  return { ...rulesScore(comment, industryKey), source: 'rules' }
}

/**
 * 生成回复话术：评论 → 三版话术
 * 无 LLM 时由调用方回退到 mock.js 的 generateReplies。
 */
export async function repliesFor(lead) {
  if (!llmEnabled) throw new Error('LLM_DISABLED')
  const out = await chatJSON(
    '你是私域获客的话术专家。根据客户的评论写 3 条不同风格的回复，只输出 JSON：{"replies": [{"key":"pro","label":"专业版","tone":"一句话说明","text":"回复正文"},{"key":"warm","label":"亲切版",...},{"key":"push","label":"促单版",...}]}。要求：口语自然、不过度推销、每条 60 字以内、贴合评论里的问题。',
    `行业：${lead.industry}\n客户评论：${lead.comment}\n客户昵称：${lead.nick}`
  )
  const replies = (out.replies || []).filter((r) => r && r.text).map((r) => ({
    key: r.key || 'pro',
    label: r.label || '推荐',
    tone: r.tone || '',
    text: r.text,
    source: 'llm'
  }))
  if (!replies.length) throw new Error('LLM_EMPTY')
  return replies
}
