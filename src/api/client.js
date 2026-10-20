/**
 * 后端 API 客户端：开发环境指向 5190 端口，生产构建后同源直连。
 * token 存 localStorage；401 时自动清除并跳转登录态。
 */
const API_BASE =
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://127.0.0.1:5190' : '')

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
    throw new Error('无法连接后端服务，请确认已启动（npm run server）')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) clearToken()
    throw new Error(data.error || `请求失败（HTTP ${res.status}）`)
  }
  return data
}

/** WebSocket 连接：自动鉴权、断线重连（指数退避，最多 5 次）。返回关闭函数。 */
export function wsConnect(onMessage) {
  const t = getToken()
  if (!t) return () => {}
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
