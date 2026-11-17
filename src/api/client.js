/**
 * 后端 API 客户端：本地默认同源，静态站点需显式配置后端地址。
 * token 存 localStorage；401 时自动清除并跳转登录态。
 */
const BACKEND_KEY = 'lr_api_base'
export const STATIC_HOSTING = import.meta.env.VITE_STATIC_HOSTING === 'true' ||
  location.hostname.endsWith('.github.io')
const DEFAULT_API_BASE = (import.meta.env.VITE_API_BASE ||
  (import.meta.env.DEV ? 'http://127.0.0.1:5190' : '')).replace(/\/+$/, '')
let API_BASE = DEFAULT_API_BASE
try { API_BASE = localStorage.getItem(BACKEND_KEY) || DEFAULT_API_BASE } catch { /* ignore */ }

export const getApiBase = () => API_BASE
export const backendConfigured = () => !STATIC_HOSTING || !!API_BASE

export function setApiBase(value) {
  const base = value.trim().replace(/\/+$/, '')
  if (base) {
    let url
    try { url = new URL(base) } catch { throw new Error('请输入完整的后端服务地址，例如 https://api.example.com') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('后端地址仅支持 HTTP / HTTPS，请勿包含账号、密码、查询参数或锚点')
    }
    if (location.protocol === 'https:' && url.protocol !== 'https:') {
      throw new Error('线上页面需要 HTTPS 后端地址；使用本机服务请点击「打开本机完整版本」')
    }
    if (STATIC_HOSTING && (url.origin === location.origin || url.hostname.endsWith('.github.io'))) {
      throw new Error('此地址是 GitHub Pages 演示站，请填写实际运行后端服务的 HTTPS 地址')
    }
  }
  API_BASE = base || DEFAULT_API_BASE
  try {
    if (base) localStorage.setItem(BACKEND_KEY, base)
    else localStorage.removeItem(BACKEND_KEY)
  } catch { /* 隐私模式仅在本次会话生效 */ }
}

export async function checkBackend() {
  if (!backendConfigured()) throw new Error('当前演示站尚未连接登录服务，请填写后端地址或打开本机完整版本')
  let res
  try {
    res = await fetch(API_BASE + '/api/health', { signal: AbortSignal.timeout(10000) })
  } catch {
    throw new Error('无法连接登录服务，请检查地址、HTTPS 和后端跨域配置')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok || data?.ok !== true) {
    throw new Error('此地址没有可用的线索雷达后端服务，请检查后端是否已部署并启动')
  }
}

const TOKEN_KEY = 'lr_token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t) => {
  try { localStorage.setItem(TOKEN_KEY, t) } catch { /* 隐私模式忽略 */ }
}
export const clearToken = () => {
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}

export async function api(path, { method = 'GET', body } = {}) {
  if (!backendConfigured()) throw new Error('当前演示站尚未连接登录服务，请填写后端地址或打开本机完整版本')
  const headers = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) headers.Authorization = 'Bearer ' + t
  let res
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new Error('无法连接后端服务，请检查服务地址并确认后端已启动')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) clearToken()
    if (res.status === 405) throw new Error('当前地址不支持此操作，请确认连接的是后端服务，而不是前端静态站点')
    throw new Error(data.error || `请求失败（HTTP ${res.status}）`)
  }
  return data
}

/** WebSocket 连接：自动鉴权、断线重连（指数退避，最多 5 次）。返回关闭函数。 */
export function wsConnect(onMessage) {
  const t = getToken()
  if (!t || !backendConfigured()) return () => {}
  let ws = null
  let closed = false
  let retry = 0
  let timer = null

  const open = () => {
    const wsBase = API_BASE ? API_BASE.replace(/^http/, 'ws') : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
    try {
      ws = new WebSocket(`${wsBase}/ws`)
    } catch {
      scheduleRetry()
      return
    }
    ws.onopen = () => {
      retry = 0
      ws.send(JSON.stringify({ type: 'auth', token: t }))
    }
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)) } catch { /* 忽略非 JSON */ }
    }
    ws.onclose = scheduleRetry
    ws.onerror = () => {}
  }

  const scheduleRetry = () => {
    if (closed || retry >= 5) return
    retry++
    timer = setTimeout(open, 1500 * retry)
  }

  open()
  return () => {
    closed = true
    clearTimeout(timer)
    try { ws && ws.close() } catch { /* ignore */ }
  }
}

export { API_BASE }
