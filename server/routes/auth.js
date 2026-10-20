import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { signToken, requireAuth } from '../auth.js'

const router = Router()

router.post('/register', (req, res) => {
  const { username, password, displayName } = req.body || {}
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: '用户名必填，密码至少 6 位' })
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) return res.status(409).json({ error: '用户名已存在' })
  const hash = bcrypt.hashSync(password, 10)
  const info = db
    .prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
    .run(username, hash, displayName || username)
  const user = { id: info.lastInsertRowid, username }
  res.json({ token: signToken(user), user: { id: user.id, username, displayName: displayName || username } })
})

router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username || '')
  if (!row || !bcrypt.compareSync(password || '', row.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  res.json({
    token: signToken(row),
    user: { id: row.id, username: row.username, displayName: row.display_name }
  })
})

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(req.user.id)
  if (!row) return res.status(401).json({ error: '用户不存在' })
  const accounts = db
    .prepare('SELECT platform, account_name, adapter, status FROM platform_accounts WHERE user_id = ?')
    .all(req.user.id)
  res.json({ user: { id: row.id, username: row.username, displayName: row.display_name }, accounts })
})

export default router
