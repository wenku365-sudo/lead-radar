import React, { createContext, useContext, useMemo, useState, useRef, useEffect } from 'react'
import { generateCustomers, DEFAULT_TASKS, understandTask, generateReplies as rulesReplies } from './data/mock.js'
import { api, getToken, clearToken, wsConnect } from './api/client.js'
import CollectModal from './components/CollectModal.jsx'
import PresentMode from './components/PresentMode.jsx'
import Home from './pages/Home.jsx'
import TaskCreate from './pages/TaskCreate.jsx'
import Workbench from './pages/Workbench.jsx'
import Collection from './pages/Collection.jsx'
import Customers from './pages/Customers.jsx'
import Followup from './pages/Followup.jsx'
import Login from './pages/Login.jsx'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)
export { AppContext }

// 实时采集时客户池上限（超出后淘汰最旧数据，保证长时间演示不卡）
const MAX_CUSTOMERS = 800

const PAGES = [
  { key: 'home', label: '首页' },
  { key: 'task', label: 'AI 交代任务' },
  { key: 'workbench', label: '工作台' },
  { key: 'collection', label: '采集数据' },
  { key: 'customers', label: '意向客户' },
  { key: 'followup', label: '跟进工作台' }
]

const MODE_KEY = 'lr_mode'
function initialMode() {
  try {
    const p = new URLSearchParams(location.search).get('mode')
    if (p === 'api' || p === 'demo') {
      localStorage.setItem(MODE_KEY, p)
      return p
    }
    return localStorage.getItem(MODE_KEY) || 'demo'
  } catch {
    return 'demo'
  }
}

export default function App() {
  const [mode, setMode] = useState(initialMode) // 'demo' 演示模式 | 'api' 在线模式
  const [page, setPage] = useState('home')
  const [customers, setCustomers] = useState(() => (initialMode() === 'demo' ? generateCustomers() : []))
  const [tasks, setTasks] = useState(() => (initialMode() === 'demo' ? DEFAULT_TASKS : []))
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(mode !== 'api') // 在线模式启动时校验既有 token
  const [collectTask, setCollectTask] = useState(null)
  // 演讲模式演示驱动：{ text, nonce }，AI 交代任务页监听后自动输入并生成
  const [demoTask, setDemoTask] = useState(null)
  // 演讲模式开关
  const [presentOn, setPresentOn] = useState(false)

  // 实时线索的订阅者（意向客户页注册，WS 推送时触发插入动效）
  const liveSubs = useRef(new Set())
  const notifyLive = (lead) => {
    for (const fn of liveSubs.current) fn(lead)
  }

  const refreshData = async () => {
    const [lr, tr] = await Promise.all([api('/api/leads?limit=800'), api('/api/tasks')])
    setCustomers(lr.leads)
    setTasks(tr.tasks)
  }

  // 在线模式：登录成功
  const login = async (u) => {
    setUser(u)
    setAuthReady(true)
    try {
      await refreshData()
    } catch (e) {
      console.error('拉取数据失败:', e)
    }
  }

  // 切回演示模式
  const backToDemo = () => {
    clearToken()
    setUser(null)
    setMode('demo')
    try { localStorage.setItem(MODE_KEY, 'demo') } catch { /* ignore */ }
    setCustomers(generateCustomers())
    setTasks(DEFAULT_TASKS)
    setPage('home')
  }

  const switchToApi = () => {
    setMode('api')
    try { localStorage.setItem(MODE_KEY, 'api') } catch { /* ignore */ }
    setCustomers([])
    setTasks([])
    setAuthReady(!!getToken())
  }

  // 在线模式启动：用既有 token 校验身份并拉数据
  useEffect(() => {
    if (mode !== 'api') return
    let cancelled = false
    const t = getToken()
    if (!t) {
      setAuthReady(true)
      return
    }
    ;(async () => {
      try {
        const r = await api('/api/auth/me')
        if (cancelled) return
        setUser(r.user)
        await refreshData()
      } catch {
        clearToken()
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 在线模式：WebSocket 实时推送（新线索 → 插入列表 + 触发动效）
  useEffect(() => {
    if (mode !== 'api' || !user) return
    return wsConnect((msg) => {
      if (msg.type === 'lead:new' && msg.lead) {
        setCustomers((prev) => {
          if (prev.some((c) => c.id === msg.lead.id)) return prev
          const next = [msg.lead, ...prev]
          return next.length > MAX_CUSTOMERS ? next.slice(0, MAX_CUSTOMERS) : next
        })
        notifyLive(msg.lead)
      }
    })
  }, [mode, user])

  const ctx = useMemo(
    () => ({
      mode,
      user,
      login,
      backToDemo,
      switchToApi,
      // 注册实时线索监听（返回取消函数）
      onLive: (fn) => {
        liveSubs.current.add(fn)
        return () => liveSubs.current.delete(fn)
      },
      customers,
      setCustomers,
      tasks,
      setTasks,
      page,
      go: setPage,
      demoTask,
      setDemoTask,
      presentOn,
      setPresentOn,
      openCollect: (task) => {
        setCollectTask(task)
        // 在线模式：真实触发一轮后端采集（22 秒动画期间 worker 同步在跑）
        if (mode === 'api' && task?.dbId) {
          api(`/api/tasks/${task.dbId}/run`, { method: 'POST' }).catch((e) =>
            console.warn('触发采集失败:', e.message)
          )
        }
      },
      closeCollect: () => setCollectTask(null),
      // AI 解析任务：在线模式走后端（可接 LLM），演示模式本地规则
      parseTask: (input) =>
        mode === 'api'
          ? api('/api/tasks/parse', { method: 'POST', body: { input } }).then((r) => r.parsed)
          : Promise.resolve(understandTask(input)),
      // AI 推荐话术：在线模式走后端（可接 LLM），演示模式本地模板
      getReplies: (c) =>
        mode === 'api' && c.id
          ? api(`/api/leads/${c.id}/replies`, { method: 'POST' })
              .then((r) => r.replies)
              .catch(() => rulesReplies(c))
          : Promise.resolve(rulesReplies(c)),
      // 新建任务（由 AI 交代任务页调用）；返回可用于采集动画的任务对象
      addTask: async (task) => {
        if (mode === 'api') {
          try {
            const r = await api('/api/tasks', {
              method: 'POST',
              body: { input: task.title, desc: task.desc }
            })
            setTasks((prev) => [r.task, ...prev])
            return r.task
          } catch (e) {
            console.warn('创建任务失败:', e.message)
          }
        }
        const local = { ...task, id: 'u' + Date.now(), status: 'new' }
        setTasks((prev) => [local, ...prev])
        return local
      },
      markFollowed: (id) => {
        if (mode === 'api') {
          api(`/api/leads/${id}`, { method: 'PATCH', body: { followed: true } }).catch(() => {})
        }
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, followed: true, later: false, followStatus: c.followStatus === 'deal' || c.followStatus === 'visited' ? c.followStatus : 'contacted' }
              : c
          )
        )
      },
      markLater: (id) => {
        const target = customers.find((c) => c.id === id)
        if (mode === 'api') {
          api(`/api/leads/${id}`, { method: 'PATCH', body: { later: !(target && target.later) } }).catch(() => {})
        }
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, later: !c.later } : c)))
      },
      // 跟进状态流转（待跟进 → 已联系 → 已到店 → 已成交）
      setFollowStatus: (id, status) => {
        if (mode === 'api') {
          api(`/api/leads/${id}`, { method: 'PATCH', body: { followStatus: status } }).catch(() => {})
        }
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, followStatus: status, followed: status !== 'todo', later: false }
              : c
          )
        )
      },
      // 跟进备注
      setNote: (id, note) => {
        if (mode === 'api') {
          api(`/api/leads/${id}`, { method: 'PATCH', body: { note } }).catch(() => {})
        }
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, note } : c)))
      },
      // 实时采集中插入新客户（插入到列表最前），超上限时淘汰最旧数据
      addCustomer: (c) => {
        setCustomers((prev) => {
          const next = [c, ...prev]
          return next.length > MAX_CUSTOMERS ? next.slice(0, MAX_CUSTOMERS) : next
        })
      }
    }),
    [customers, tasks, page, demoTask, presentOn, mode, user]
  )

  // 在线模式未登录 → 登录页；token 校验中 → 加载屏
  if (mode === 'api' && (!user || !authReady)) {
    if (!authReady) {
      return (
        <div className="login-wrap">
          <div className="login-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div className="brand-logo" style={{ margin: '0 auto 14px' }}>📡</div>
            <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>正在连接后端服务…</div>
          </div>
        </div>
      )
    }
    return <Login />
  }

  return (
    <AppContext.Provider value={ctx}>
      <nav className="topnav">
        <div className="topnav-inner">
          <div className="brand" onClick={() => setPage('home')}>
            <div className="brand-logo">📡</div>
            <div>
              线索雷达
              <small>{mode === 'api' ? '在线模式 · 真实数据' : 'AI 自动获客演示平台'}</small>
            </div>
          </div>
          <div className="nav-links">
            {PAGES.map((p) => (
              <button
                key={p.key}
                className={'nav-link' + (page === p.key ? ' active' : '')}
                onClick={() => setPage(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="nav-right">
            {mode === 'api' ? (
              <button
                className="nav-mode on"
                onClick={backToDemo}
                title="退出登录并切回演示模式"
              >
                🟢 {user ? user.username : 'demo'} · 退出
              </button>
            ) : (
              <button
                className="nav-mode"
                onClick={switchToApi}
                title="连接后端服务，使用真实数据库与实时采集"
              >
                连接后端
              </button>
            )}
            <button
              className={'nav-present' + (presentOn ? ' on' : '')}
              onClick={() => setPresentOn((v) => !v)}
              title="自动串场播放，适合展会大屏与现场讲解"
            >
              {presentOn ? '■ 退出演讲模式' : '▶ 演讲模式'}
            </button>
            <button className="nav-cta" onClick={() => setPage('task')}>
              开始 AI 获客
            </button>
          </div>
        </div>
      </nav>

      {page === 'home' && <Home />}
      {page === 'task' && <TaskCreate />}
      {page === 'workbench' && <Workbench />}
      {page === 'collection' && <Collection />}
      {page === 'customers' && <Customers />}
      {page === 'followup' && <Followup />}

      {collectTask && <CollectModal task={collectTask} onClose={ctx.closeCollect} />}
      {presentOn && <PresentMode onExit={() => setPresentOn(false)} />}
    </AppContext.Provider>
  )
}
