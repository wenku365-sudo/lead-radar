import React, { useState } from 'react'
import { useApp } from '../App.jsx'
import { api, setToken } from '../api/client.js'

/**
 * 登录 / 注册页（在线模式入口）。
 * 演示账号：demo / demo123
 */
export default function Login() {
  const { login, backToDemo } = useApp()
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setErr('')
    if (!username.trim() || password.length < 6) {
      setErr('请输入用户名，密码至少 6 位')
      return
    }
    setBusy(true)
    try {
      const r = await api(`/api/auth/${tab}`, {
        method: 'POST',
        body: { username: username.trim(), password }
      })
      setToken(r.token)
      await login(r.user)
    } catch (e2) {
      setErr(e2.message || '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-glow login-glow-a" />
      <div className="login-glow login-glow-b" />
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-logo">📡</div>
          <div className="login-title">线索雷达</div>
          <div className="login-sub">连接后端服务 · 真实数据在线模式</div>
        </div>

        <div className="login-tabs">
          <button className={'login-tab' + (tab === 'login' ? ' on' : '')} onClick={() => { setTab('login'); setErr('') }}>
            登录
          </button>
          <button className={'login-tab' + (tab === 'register' ? ' on' : '')} onClick={() => { setTab('register'); setErr('') }}>
            注册新账号
          </button>
        </div>

        <form onSubmit={submit} className="login-form">
          <label className="login-field">
            <span>用户名</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="demo"
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="login-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {err && <div className="login-err">⚠ {err}</div>}

          <button type="submit" className="btn btn-lg login-submit" disabled={busy}>
            {busy ? '连接中…' : tab === 'login' ? '登录并连接后端' : '创建账号并登录'}
          </button>
        </form>

        <div className="login-hint">
          演示账号 <b>demo</b> / <b>demo123</b>，已预置 7 个采集任务与 372+ 条线索
        </div>

        <button className="login-back" onClick={backToDemo}>
          ← 返回演示模式（无需登录，使用前端模拟数据）
        </button>
      </div>
    </div>
  )
}
