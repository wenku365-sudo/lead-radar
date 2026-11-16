// 自定义行业优先按新建任务排序，目标行业置顶；尚无线索的任务也保留分类入口。
export function customerIndustryTabs(industries, tasks, customers, selectedKey) {
  const builtIn = industries.filter((industry) => !industry.generated)
  const builtInKeys = new Set(builtIn.map((industry) => industry.key))
  const registry = new Map(industries.map((industry) => [industry.key, industry]))
  const custom = new Map()
  const add = (key, name, emoji) => {
    if (!key || builtInKeys.has(key) || custom.has(key)) return
    const industry = registry.get(key)
    custom.set(key, {
      ...industry, key, name: name || industry?.name || key,
      emoji: emoji || industry?.emoji || '✨', custom: true
    })
  }
  for (const task of tasks) {
    add(task.industryKey || task.understanding?.industryKey, task.industry || task.understanding?.industryName, task.emoji)
  }
  for (const industry of [...industries].reverse()) {
    if (industry.generated) add(industry.key, industry.name, industry.emoji)
  }
  for (const customer of customers) add(customer.industryKey, customer.industry)
  const first = custom.get(selectedKey)
  return [...(first ? [first] : []), ...[...custom.values()].filter((industry) => industry !== first), ...builtIn]
}
