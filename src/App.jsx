import React, { createContext, useContext, useMemo, useState } from 'react'
import { generateCustomers, DEFAULT_TASKS, FOLLOW_STATUS } from './data/mock.js'
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
  const [page, setPage] = useState('home')
  const [customers, setCustomers] = useState(() => generateCustomers())
  const [tasks, setTasks] = useState(DEFAULT_TASKS)
  const [collectTask, setCollectTask] = useState(null)
  // 演讲模式演示驱动：{ text, nonce }，AI 交代任务页监听后自动输入并生成
  const [demoTask, setDemoTask] = useState(null)
  // 演讲模式开关
  const [presentOn, setPresentOn] = useState(false)

  const ctx = useMemo(
    () => ({
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
      openCollect: (task) => setCollectTask(task),
      closeCollect: () => setCollectTask(null),
      // 新建任务（由 AI 交代任务页调用）
      addTask: (task) => {
        setTasks((prev) => [{ ...task, id: 'u' + Date.now(), status: 'new' }, ...prev])
      },
      markFollowed: (id) => {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, followed: true, later: false, followStatus: c.followStatus === 'deal' || c.followStatus === 'visited' ? c.followStatus : 'contacted' }
              : c
          )
        )
      },
      markLater: (id) => {
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, later: !c.later } : c)))
      },
      // 跟进状态流转（待跟进 → 已联系 → 已到店 → 已成交）
      setFollowStatus: (id, status) => {
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
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, note } : c)))
      },
      // 实时采集中插入新客户（插入到列表最前），超上限时淘汰最旧数据，防止长时间演示卡顿
      addCustomer: (c) => {
        setCustomers((prev) => {
          const next = [c, ...prev]
          return next.length > MAX_CUSTOMERS ? next.slice(0, MAX_CUSTOMERS) : next
        })
      }
    }),
    [customers, tasks, page, demoTask, presentOn]
  )

  return (
    <AppContext.Provider value={ctx}>
      <nav className="topnav">
        <div className="topnav-inner">
          <div className="brand" onClick={() => setPage('home')}>
            <div className="brand-logo">📡</div>
            <div>
              线索雷达
              <small>AI 自动获客演示平台</small>
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

      {collectTask && <CollectModal task={collectTask} onClose={ctx.closeCollect} />}
      {presentOn && <PresentMode onExit={() => setPresentOn(false)} />}
    </AppContext.Provider>
  )
}
