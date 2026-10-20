import { WebSocketServer } from 'ws'
import { verifyToken } from './auth.js'

/**
 * WebSocket 中心：客户端连接后发送 {type:'auth', token} 完成鉴权，
 * 之后服务端按用户推送 {type:'lead:new', lead} / {type:'task:update', task} 等事件。
 */
export function createHub(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })
  const clients = new Map() // ws -> userId

  wss.on('connection', (ws, req) => {
    let authed = false
    const reject = setTimeout(() => {
      if (!authed) ws.close(4001, 'auth timeout')
    }, 10000)

    ws.on('message', (raw) => {
      let msg
      try { msg = JSON.parse(raw.toString()) } catch { return }
      if (msg.type === 'auth' && msg.token) {
        const payload = verifyToken(msg.token)
        if (payload) {
          authed = true
          clearTimeout(reject)
          clients.set(ws, payload.id)
          ws.send(JSON.stringify({ type: 'auth_ok', username: payload.username }))
        } else {
          ws.send(JSON.stringify({ type: 'auth_failed' }))
          ws.close(4003, 'invalid token')
        }
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    })

    ws.on('close', () => clients.delete(ws))
    ws.on('error', () => clients.delete(ws))
  })

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' }))
    }
  }, 30000)
  wss.on('close', () => clearInterval(heartbeat))

  return {
    /** 向某个用户的全部在线连接推送 */
    broadcast(userId, payload) {
      const text = JSON.stringify(payload)
      for (const [ws, uid] of clients) {
        if (uid === userId && ws.readyState === 1) ws.send(text)
      }
    },
    broadcastAll(payload) {
      const text = JSON.stringify(payload)
      for (const [ws] of clients) {
        if (ws.readyState === 1) ws.send(text)
      }
    },
    onlineCount() {
      return clients.size
    }
  }
}
