import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'lead-radar-dev-secret-change-me'
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
