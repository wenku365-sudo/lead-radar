import { INDUSTRIES } from './mock.js'
import { synthIndustry } from './industry-synth.js'

// 在线任务只携带行业标识，刷新后前端可能尚未注册该动态行业。
// 按任务原话还原行业样本，避免找不到行业时显示无关的家具模板。
export function resolveCollectionPreview(task) {
  const understanding = task.understanding || {}
  const key = task.industryKey || understanding.industryKey
  const name = task.industry || understanding.industryName
  const industry =
    (key && INDUSTRIES.find((item) => item.key === key)) ||
    (name && INDUSTRIES.find((item) => item.name === name)) ||
    synthIndustry(understanding.input || task.title || name || '')

  const searchKeywords = [task.searchKeywords, understanding.searchKeywords]
    .find((words) => Array.isArray(words) && words.some((word) => String(word).trim()))
  const searchWord = searchKeywords?.map((word) => String(word).trim()).find(Boolean)

  return {
    ...industry,
    emoji: task.emoji || understanding.emoji || industry.emoji,
    searchWord: searchWord || industry.searchWord
  }
}
