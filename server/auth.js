import jwt from 'jsonwebtoken'

const DEV_SECRET = 'lead-radar-dev-secret-change-me'
const configuredSecret = process.env.JWT_SECRET
if (process.env.NODE_ENV === 'production' &&
    (!configuredSecret || configuredSecret.length < 32 || configuredSecret === DEV_SECRET)) {
  throw new Error('生产环境必须设置至少 32 字符的随机 JWT_SECRET')
}
const SECRET = configuredSecret || DEV_SECRET
const EXPIRES = process.env.JWT_EXPIRES || '7d'

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: EXPIRES })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

/** REST 鉴权中间件 */
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  const payload = token ? verifyToken(token) : null
  if (!payload) return res.status(401).json({ error: '未登录或登录已过期' })
  req.user = payload
  next()
}
