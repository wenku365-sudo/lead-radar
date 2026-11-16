/**
 * 适配器注册表：worker 按 LR_COLLECTOR 解析当前数据源。
 *
 *   LR_COLLECTOR=browser  浏览器自动化（Playwright 驱动，目标为本地仿真抖音页面 /sim）
 *   LR_COLLECTOR=http     真实 HTTP 数据通道（需配置 LR_DOUYIN_API_BASE）
 *   LR_COLLECTOR=mock     演示模拟数据
 *   LR_COLLECTOR=auto（默认）配置了 LR_DOUYIN_API_BASE 用 http，否则 mock
 */
import { mockAdapter } from './mock-adapter.js'
import { douyinHttpAdapter, douyinHttpEnabled } from './douyin-http.js'
import { browserAdapter, browserInfo } from './browser-adapter.js'

const COLLECTOR = (process.env.LR_COLLECTOR || 'auto').toLowerCase()
export const browserEnabled = COLLECTOR === 'browser'

/** 解析当前生效的适配器 */
export function resolveAdapter() {
  if (browserEnabled) return browserAdapter
  if (COLLECTOR === 'http' || (COLLECTOR === 'auto' && douyinHttpEnabled)) return douyinHttpAdapter
  return mockAdapter
}

/** 数据源状态（供 /api/data-source 与启动日志） */
export function dataSourceInfo() {
  if (browserEnabled) {
    const info = browserInfo()
    return {
      mode: 'browser',
      name: 'browser',
      adapter: '浏览器自动化采集（本地仿真抖音页面）',
      baseUrl: info.sourceUrl,
      headless: info.headless
    }
  }
  if (douyinHttpEnabled) {
    return {
      mode: 'http',
      name: 'douyin-http',
      adapter: '抖音数据通道（真实 HTTP）',
      baseUrl: (process.env.LR_DOUYIN_API_BASE || '').replace(/\/\/.*/, '//***/') // 脱敏
    }
  }
  return {
    mode: 'mock',
    name: 'mock',
    adapter: '演示模拟数据',
    hint: 'LR_COLLECTOR=browser 启用浏览器自动化采集；配置 LR_DOUYIN_API_BASE 接入真实数据通道'
  }
}
