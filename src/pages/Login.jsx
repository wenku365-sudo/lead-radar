import React, { useState } from 'react'
import { useApp } from '../App.jsx'
import { api, clearToken, setToken, getApiBase, setApiBase, checkBackend, STATIC_HOSTING } from '../api/client.js'
import { TOTAL_LEADS } from '../data/mock.js'

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
  const [backend, setBackend] = useState(getApiBase)
  const needsBackend = STATIC_HOSTING && !backend.trim()

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
      const previousBase = getApiBase()
      setApiBase(backend)
      if (getApiBase() !== previousBase) clearToken()
      // 先验证健康接口，再向确认可用的后端发送账号密码。
      await checkBackend()
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
          <div className="login-sub">{STATIC_HOSTING ? '线上演示站 · 连接后端后可登录' : '连接后端服务 · 真实数据在线模式'}</div>
        </div>

        {STATIC_HOSTING && (
          <div className="login-hint login-service-notice">
            当前站点仅提供前端演示，登录、注册和数据保存需要后端服务。
            <a href="http://127.0.0.1:5190/?mode=api" target="_blank" rel="noreferrer">打开本机完整版本 ↗</a>
            <small>适用于当前电脑已启动本机服务；其他设备请填写已部署的 HTTPS 后端地址。</small>
          </div>
        )}

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
            <span>后端服务地址{!STATIC_HOSTING && '（留空使用默认服务）'}</span>
            <input
              type="url"
              value={backend}
              onChange={(e) => { setBackend(e.target.value); setErr('') }}
              placeholder={STATIC_HOSTING ? 'https://api.example.com' : '默认连接当前服务'}
              autoComplete="url"
              required={STATIC_HOSTING}
              disabled={busy}
            />
          </label>
          <label className="login-field">
            <span>用户名</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="demo"
              autoComplete="username"
              disabled={busy}
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
              disabled={busy}
            />
          </label>

          {err && <div className="login-err">⚠ {err}</div>}

          <button type="submit" className="btn btn-lg login-submit" disabled={busy || needsBackend}>
            {busy ? '连接中…' : needsBackend ? '请先填写后端服务地址' : tab === 'login' ? '登录并连接后端' : '创建账号并登录'}
          </button>
        </form>

        <div className="login-hint">
          {STATIC_HOSTING || import.meta.env.PROD ? <>首次使用公网服务请点击「注册新账号」。只有后端已启用演示数据时，才可使用 <b>demo</b> / <b>demo123</b>。</> : <>演示账号 <b>demo</b> / <b>demo123</b>，已预置 8 个采集任务与 {TOTAL_LEADS}+ 条线索</>}
        </div>

        <button className="login-back" onClick={backToDemo}>
          ← 返回演示模式（无需登录，使用前端模拟数据）
        </button>
      </div>
    </div>
  )
}
