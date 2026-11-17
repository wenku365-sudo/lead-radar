import React, { createContext, useContext, useMemo, useState, useRef } from 'react'
import { generateCustomers, getIndustryCustomers, INITIAL_PER_INDUSTRY, DEFAULT_TASKS, understandTask, generateReplies as rulesReplies } from './data/mock.js'
import { api } from './api/client.js'
import CollectModal from './components/CollectModal.jsx'
import PresentMode from './components/PresentMode.jsx'
import Home from './pages/Home.jsx'
import TaskCreate from './pages/TaskCreate.jsx'
import Workbench from './pages/Workbench.jsx'
import Collection from './pages/Collection.jsx'
import Customers from './pages/Customers.jsx'
import Followup from './pages/Followup.jsx'

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

export default function App() {
  const mode = 'demo'
  const [page, setPage] = useState('home')
  const [customers, setCustomers] = useState(generateCustomers)
  const [tasks, setTasks] = useState(DEFAULT_TASKS)
  const [collectTask, setCollectTask] = useState(null)
  // 意向客户页待应用的行业筛选（采集完成后跳转时带上，页面消费后清空）
  const [customerFocus, setCustomerFocus] = useState(null)
  // 演讲模式演示驱动：{ text, nonce }，AI 交代任务页监听后自动输入并生成
  const [demoTask, setDemoTask] = useState(null)
  // 演讲模式开关
  const [presentOn, setPresentOn] = useState(false)

  // 实时线索的订阅者（意向客户页注册，WS 推送时触发插入动效）
  const liveSubs = useRef(new Set())
  const notifyLive = (lead) => {
    for (const fn of liveSubs.current) fn(lead)
  }

  const ctx = useMemo(
    () => ({
      mode,
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
        // 在线模式：触发一轮后端采集，worker 与弹窗动画独立运行
        if (mode === 'api' && task?.dbId) {
          api(`/api/tasks/${task.dbId}/run`, { method: 'POST' }).catch((e) =>
            console.warn('触发采集失败:', e.message)
          )
        }
      },
      closeCollect: () => setCollectTask(null),
      // 采集完成后跳转：打开意向客户页并自动筛选到本次任务所属行业
      customerFocus,
      clearCustomerFocus: () => setCustomerFocus(null),
      focusCustomers: (industryKey) => {
        setCustomerFocus(industryKey || null)
        setPage('customers')
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (e) {
          /* SSR / 无 window 环境忽略 */
        }
        if (!industryKey) return

        const merge = (incoming) =>
          setCustomers((prev) => {
            const seen = new Set(prev.map((c) => c.id))
            const add = incoming.filter((c) => !seen.has(c.id))
            return add.length ? [...add, ...prev] : prev
          })

        if (mode === 'demo') {
          // 动态行业首次创建任务时，列表里可能还没有该行业样本 → 先补前 20 条，
          // 其余 50-100 条由意向客户页渐进载入（复用新线索插入动效）
          setCustomers((prev) => {
            if (prev.some((c) => c.industryKey === industryKey)) return prev
            const first = getIndustryCustomers(industryKey).slice(0, INITIAL_PER_INDUSTRY)
            return first.length ? [...first, ...prev] : prev
          })
        } else {
          // 在线模式：真实采集可能刚刚落库，立即拉一次，稍后再补拉一次
          const pull = () =>
            api(`/api/leads?industry=${encodeURIComponent(industryKey)}&limit=500`)
              .then((r) => merge(r.leads || []))
              .catch(() => {})
          pull()
          setTimeout(pull, 8000)
        }
      },
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
              body: {
                input: task.title,
                desc: task.desc,
                searchKeywords: task.searchKeywords || [],
                matchWords: task.matchWords || []
              }
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
    [customers, tasks, page, demoTask, presentOn, customerFocus]
  )

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

      {collectTask && (
        <CollectModal
          task={collectTask}
          onClose={ctx.closeCollect}
          onViewCustomers={() => {
            const key = collectTask.industryKey || collectTask.understanding?.industryKey || null
            ctx.closeCollect()
            ctx.focusCustomers(key)
          }}
        />
      )}
      {presentOn && <PresentMode onExit={() => setPresentOn(false)} />}
    </AppContext.Provider>
  )
}
