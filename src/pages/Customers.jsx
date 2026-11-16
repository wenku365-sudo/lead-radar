import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App.jsx'
import { INDUSTRIES, getIndustryCustomers, splitKeywords, levelName, makeLiveCustomer, generateReplies } from '../data/mock.js'
import { useProgressiveCustomers } from '../data/use-progressive-customers.js'
import { customerIndustryTabs } from '../data/customer-industry-tabs.js'

function KwText({ text }) {
  return (
    <>
      {splitKeywords(text).map((p, i) =>
        p.kw ? <span key={i} className="kw">{p.t}</span> : <span key={i}>{p.t}</span>
      )}
    </>
  )
}

// 数字跳动：值变化时播放一次缩放高亮动画
function Bump({ value, className }) {
  const [bump, setBump] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value
      setBump(true)
      const t = setTimeout(() => setBump(false), 620)
      return () => clearTimeout(t)
    }
  }, [value])
  return <span className={(className || '') + (bump ? ' bump' : '')}>{value.toLocaleString()}</span>
}

const SPEEDS = [
  { label: '慢速 4s', v: 4000 },
  { label: '标准 2.5s', v: 2500 },
  { label: '快速 0.75s', v: 750 },
  { label: '极速 0.35s', v: 350 }
]

export default function Customers() {
  const { customers, tasks, markFollowed, markLater, addCustomer, mode, onLive, getReplies, customerFocus, clearCustomerFocus } = useApp()
  const [ind, setInd] = useState(customerFocus || 'all')
  const [platform, setPlatform] = useState('all')
  const [level, setLevel] = useState('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [indOpen, setIndOpen] = useState(false) // 行业筛选：默认收起只显示一行

  // ===== 实时采集动效状态 =====
  const [live, setLive] = useState(true)
  const [speed, setSpeed] = useState(2800)
  const [freshIds, setFreshIds] = useState([])   // 高亮中的新数据（约 6 秒后淡出）
  const [sessionNew, setSessionNew] = useState(0) // 本次停留新增
  const [toast, setToast] = useState(null)        // 右下角浮动提示
  const [lastAt, setLastAt] = useState(null)
  const [copied, setCopied] = useState(null)
  const [replies, setReplies] = useState(null) // 抽屉话术：null=生成中
  const animationTimers = useRef(new Set())

  useEffect(() => () => {
    for (const timer of animationTimers.current) clearTimeout(timer)
  }, [])

  const animateCustomer = (c) => {
    setSessionNew((n) => n + 1)
    setLastAt(new Date())
    setFreshIds((ids) => ids.includes(c.id) ? ids : [...ids, c.id])
    setToast({ id: c.id, nick: c.nick, industry: c.industry, score: c.score, platform: c.platform })
    const later = (fn, delay) => {
      const timer = setTimeout(() => { animationTimers.current.delete(timer); fn() }, delay)
      animationTimers.current.add(timer)
    }
    later(() => setFreshIds((ids) => ids.filter((id) => id !== c.id)), speed < 900 ? 2000 : 6000)
    later(() => setToast((t) => t?.id === c.id ? null : t), speed < 900 ? 1500 : 3000)
  }

  const list = useMemo(() => customers.filter((c) => {
    if (ind !== 'all' && c.industryKey !== ind) return false
    if (platform !== 'all' && c.platform !== platform) return false
    if (level !== 'all' && c.level !== level) return false
    if (q && !c.comment.includes(q) && !c.nick.includes(q)) return false
    return true
  }), [customers, ind, platform, level, q])
  const filterKey = JSON.stringify([mode, ind, platform, level, q])
  const { visibleCustomers, revealCustomer, hasPending } = useProgressiveCustomers(list, filterKey, live, animateCustomer)

  // ===== 行业样本渐进载入 =====
  // 每次先展示 15 条，其余已有客户及尚未载入的行业样本逐条插入，
  // 由下方定时器逐条插入列表，复用「新线索滑入 + NEW 徽标 + 右下角提示」的采集动效
  const stageQueue = useRef([])

  // 采集完成跳转过来时，自动应用本次任务的行业筛选（消费一次后清空）
  useEffect(() => {
    if (!customerFocus) return
    setInd(customerFocus)
    setPlatform('all')
    setLevel('all')
    setQ('')
    setSelected(null)
    setIndOpen(false) // 任务跳转也默认收起，自定义目标行业排在首位
    clearCustomerFocus()
  }, [customerFocus, clearCustomerFocus])

  // 打开抽屉时加载 AI 推荐话术（在线模式可走大模型，失败回退本地模板）
  useEffect(() => {
    if (!selected) {
      setReplies(null)
      return
    }
    let cancelled = false
    getReplies(selected)
      .then((r) => {
        if (!cancelled) setReplies(r)
      })
      .catch(() => {
        if (!cancelled) setReplies(generateReplies(selected))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const copyText = (text, key) => {
    try {
      navigator.clipboard?.writeText(text)
    } catch (e) {
      /* 演示环境可能无剪贴板权限，忽略 */
    }
    setCopied(key)
    setTimeout(() => setCopied(null), 1600)
  }

  // 用 ref 持有最新筛选条件，避免定时器被反复重建
  const cfg = useRef({})
  cfg.current = { ind, platform, level, q, addCustomer, revealCustomer, animateCustomer, hasPending }

  useEffect(() => {
    // 在线模式：数据流来自 WebSocket 真实推送，不走本地模拟定时器
    if (mode === 'api' || !live) return
    const timer = setInterval(() => {
      // 行业样本正在渐进载入时，暂停随机新客插入，避免两套动效打架
      if (stageQueue.current.length || cfg.current.hasPending) return
      const { ind: ci, platform: cp, level: cl, q: cq, addCustomer: add } = cfg.current
      const c = makeLiveCustomer({
        industryKey: ci === 'all' ? undefined : ci,
        platform: cp === 'all' ? undefined : cp,
        level: cl === 'all' ? undefined : cl,
        q: cq || undefined
      })
      add(c)
      cfg.current.revealCustomer(c)
      cfg.current.animateCustomer(c)
    }, speed)
    return () => clearInterval(timer)
  }, [live, speed, mode])

  // 在线模式：订阅 WebSocket 真实推送，复用同一套插入动效（列表插入由 App 层完成，这里只触发高亮/提示）
  useEffect(() => {
    if (mode !== 'api') return
    return onLive((c) => {
      cfg.current.revealCustomer(c)
      cfg.current.animateCustomer(c)
    })
  }, [mode, onLive])

  // ===== 渐进载入（演示模式）=====
  // 当前行业已展示的数据之外的存量样本（50-100 条中尚未插入的部分）排入队列
  useEffect(() => {
    if (mode === 'api' || ind === 'all') {
      stageQueue.current = []
      return
    }
    const have = new Set(customers.filter((c) => c.industryKey === ind).map((c) => c.id))
    stageQueue.current = getIndustryCustomers(ind).filter((c) => !have.has(c.id))
  }, [ind, customers, mode])

  // 队列逐条插入：复用新线索动效（行滑入高亮 + NEW 徽标 + 右下角提示 + 意向分弹跳）
  useEffect(() => {
    if (mode === 'api' || !live) return
    const timer = setInterval(() => {
      if (cfg.current.hasPending) return
      const c = stageQueue.current.shift()
      if (!c) return
      cfg.current.addCustomer(c)
      cfg.current.revealCustomer(c)
      cfg.current.animateCustomer(c)
    }, 750)
    return () => clearInterval(timer)
  }, [mode, live])

  const indCounts = useMemo(() => {
    const m = {}
    for (const c of customers) m[c.industryKey] = (m[c.industryKey] || 0) + 1
    return m
  }, [customers])

  // 最新自定义行业放在第一排首位；同时覆盖演示注册表、在线任务和历史线索。
  const indTabs = useMemo(
    () => customerIndustryTabs(INDUSTRIES, tasks, customers, ind),
    [tasks, customers, ind]
  )
  const leadingIndustry = indTabs[0]?.custom ? indTabs[0] : null
  const renderIndustryTab = (industry) => (
    <button key={industry.key} className={'ind-tab' + (ind === industry.key ? ' active' : '')} onClick={() => setInd(industry.key)}>
      {industry.emoji} {industry.name}
      <span className="cnt">{indCounts[industry.key] || 0}</span>
    </button>
  )

  const scoreCls = (l) => (l === 'high' ? 'score-high' : l === 'mid' ? 'score-mid' : 'score-low')
  const tagCls = (l) => (l === 'high' ? 'tag-red' : l === 'mid' ? 'tag-orange' : 'tag-gray')

  const todayNew = useMemo(() => customers.filter((c) => c.today).length, [customers])
  const highCount = useMemo(() => customers.filter((c) => c.level === 'high').length, [customers])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">意向客户</div>
          <div className="page-sub">
            共 {customers.length} 位客户 · 来自抖音 / 小红书公开评论 · AI 自动识别购买意向
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => { setInd('all'); setPlatform('all'); setLevel('all'); setQ('') }}>
          重置筛选
        </button>
      </div>

      {/* ===== 实时采集状态条 ===== */}
      <div className={'live-bar' + (live ? ' on' : '')}>
        <div className="live-left">
          <span className={'live-dot' + (live ? ' on' : '')} />
          <div>
            <div className="live-title">
              {live ? '实时采集中' : '采集已暂停'}
              <span className="live-sub">
                {live
                  ? (ind === 'all' ? '全部行业' : indTabs.find((i) => i.key === ind)?.name + ' · ') +
                    (platform === 'all' ? '双平台' : platform)
                  : '点击「继续采集」恢复数据流'}
              </span>
            </div>
          </div>
        </div>
        <div className="live-stats">
          <div className="live-stat">
            <div className="n" style={{ color: '#7c3aed' }}><Bump value={customers.length} /></div>
            <div className="l">累计客户</div>
          </div>
          <div className="live-stat">
            <div className="n" style={{ color: '#12915f' }}><Bump value={todayNew} /></div>
            <div className="l">今日新增</div>
          </div>
          <div className="live-stat">
            <div className="n" style={{ color: '#e0293b' }}><Bump value={highCount} /></div>
            <div className="l">高意向</div>
          </div>
          <div className="live-stat">
            <div className="n" style={{ color: '#ea7317' }}><Bump value={sessionNew} /></div>
            <div className="l">本次采集到</div>
          </div>
        </div>
        <div className="live-ctrl">
          {mode !== 'api' &&
            SPEEDS.map((s) => (
              <button
                key={s.v}
                className={'spd-btn' + (speed === s.v ? ' on' : '')}
                onClick={() => setSpeed(s.v)}
              >
                {s.label}
              </button>
            ))}
          {mode !== 'api' && (
            <button className="btn btn-sm" style={{ background: live ? '#fff' : 'var(--purple)', color: live ? 'var(--ink-2)' : '#fff', border: '1px solid var(--line)' }} onClick={() => setLive(!live)}>
              {live ? '⏸ 暂停' : '▶ 继续采集'}
            </button>
          )}
          {mode === 'api' && <span className="live-ws">⚡ 后端采集服务运行中 · 数据实时推送</span>}
        </div>
      </div>
      <div className="live-scan-wrap">
        <div className={'live-scan' + (live ? ' on' : '')} />
      </div>

      {/* 筛选工具栏 */}
      <div className="card cust-toolbar">
        <div className="ind-filter-bar">
          <div className={'ind-tabs' + (indOpen ? '' : ' collapsed')}>
            {leadingIndustry && renderIndustryTab(leadingIndustry)}
            <button className={'ind-tab' + (ind === 'all' ? ' active' : '')} onClick={() => setInd('all')}>
              全部<span className="cnt">{customers.length}</span>
            </button>
            {indTabs.filter((industry) => industry !== leadingIndustry).map(renderIndustryTab)}
          </div>
          <button
            className={'ind-toggle' + (indOpen ? ' open' : '')}
            title={indOpen ? '收起行业列表' : '展开全部行业'}
            onClick={() => setIndOpen((v) => !v)}
          >
            {!indOpen && ind !== 'all' && <i className="ind-toggle-dot" />}
            {indOpen ? '收起' : '展开全部'}
            <span className="ind-toggle-n">{indTabs.length}</span>
            <span className="ind-toggle-ar">{indOpen ? '▴' : '▾'}</span>
          </button>
        </div>
        <div className="filter-row">
          <select className="filter-select" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="all">全部平台</option>
            <option value="抖音">抖音</option>
            <option value="小红书">小红书</option>
          </select>
          <select className="filter-select" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">全部意向</option>
            <option value="high">高意向</option>
            <option value="mid">中意向</option>
            <option value="low">待确认</option>
          </select>
          <div className="search-box">
            <span className="sicon">🔍</span>
            <input
              placeholder="搜索客户昵称或评论内容，如「优惠」「多少钱」…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 700, whiteSpace: 'nowrap' }}>
            筛选结果 {list.length} 条 · 已显示 {visibleCustomers.length} 条{hasPending && ' · 逐条载入中'}
          </span>
        </div>
      </div>

      {/* 客户列表 */}
      <div className="card cust-table">
        <div className="cust-head">
          <div>客户</div>
          <div className="h-plat">平台</div>
          <div>评论内容</div>
          <div style={{ textAlign: 'center' }}>意向分</div>
          <div className="h-time">发现时间</div>
          <div className="h-src">来源视频</div>
        </div>
        {list.length === 0 ? (
          <div className="empty-state">
            <div className="eico">{ind === 'all' ? '🔍' : '⏳'}</div>
            <div className="et">
              {ind === 'all'
                ? '没有找到匹配的客户'
                : `「${indTabs.find((i) => i.key === ind)?.name || '该行业'}」暂无线索`}
            </div>
            <div className="ed">
              {ind === 'all'
                ? '试试更换行业、平台或搜索关键词，或点击右上角「重置筛选」'
                : '后台采集可能仍在进行，命中匹配词的评论会自动推送到这里；也可以「重置筛选」查看全部客户'}
            </div>
          </div>
        ) : (
          visibleCustomers.map((c) => {
            const isFresh = freshIds.includes(c.id)
            return (
            <div
              className={'cust-row' + (isFresh ? ' fresh' : '') + (isFresh && speed < 900 ? ' fast' : '')}
              key={c.id}
              onClick={() => setSelected(c)}
            >
              <div className="nick">
                <div className="cust-avatar" style={{ background: c.avatarColor }}>{c.nick[0]}</div>
                <span>
                  {c.nick}
                  {isFresh && <span className="new-badge">NEW</span>}
                  {c.followed && <span className="tag tag-green" style={{ marginLeft: 6 }}>已跟进</span>}
                  {c.later && !c.followed && <span className="tag tag-gray" style={{ marginLeft: 6 }}>稍后跟进</span>}
                </span>
              </div>
              <div className="plat-col">
                <span className={'plat ' + (c.platform === '抖音' ? 'plat-douyin' : 'plat-xhs')}>
                  <span className="dot" />
                  {c.platform}
                </span>
              </div>
              <div className="comment">
                <KwText text={c.comment} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className={'score-pill ' + scoreCls(c.level) + (isFresh ? ' pop' : '')}>{c.score}</span>
              </div>
              <div className="ftime">{c.today ? '今天' : c.time}</div>
              <div className="src" title={c.srcVideo}>🎬 {c.srcVideo}</div>
            </div>
            )
          })
        )}
      </div>

      {/* 详情抽屉 */}
      {selected && (
        <>
          <div className="drawer-mask" onClick={() => setSelected(null)} />
          <div className="drawer">
            <div className="drawer-head">
              <div className="cust-avatar" style={{ background: selected.avatarColor, width: 40, height: 40, fontSize: 16 }}>
                {selected.nick[0]}
              </div>
              <div className="dh-t">
                {selected.nick}
                <div style={{ fontSize: 12.5, color: '#6b7280', fontWeight: 400, marginTop: 2 }}>
                  {selected.platform} · 发现于 {selected.today ? '今天' : selected.time}
                </div>
              </div>
              <button className="drawer-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="drawer-body">
              <div className="d-section">
                <div className="ds-t">🧾 客户信息</div>
                <div className="d-kv"><span className="k">行业</span><span className="v">{selected.industry}</span></div>
                <div className="d-kv"><span className="k">平台</span><span className="v">{selected.platform}</span></div>
                <div className="d-kv">
                  <span className="k">意向评分</span>
                  <span className="v">
                    <span className={'score-pill ' + scoreCls(selected.level)}>{selected.score}</span>
                    <span className={'tag ' + tagCls(selected.level)} style={{ marginLeft: 8 }}>
                      {levelName[selected.level]}
                    </span>
                  </span>
                </div>
                <div className="d-kv"><span className="k">评论获赞</span><span className="v">❤️ {selected.likes}</span></div>
                <div className="d-kv"><span className="k">跟进状态</span>
                  <span className="v">
                    {selected.followed ? (
                      <span className="tag tag-green">✓ 已跟进</span>
                    ) : selected.later ? (
                      <span className="tag tag-gray">稍后跟进</span>
                    ) : (
                      <span className="tag tag-orange">待跟进</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="d-section">
                <div className="ds-t">💬 评论原文（关键词已标红）</div>
                <div className="comment-card" style={{ fontSize: 15 }}>
                  <KwText text={selected.comment} />
                </div>
              </div>

              <div className="d-section">
                <div className="ds-t">🏷️ AI 识别标签</div>
                <div className="d-tags">
                  {selected.tags.map((t) => (
                    <span key={t} className="tag tag-purple">{t}</span>
                  ))}
                  <span className={'tag ' + tagCls(selected.level)}>{levelName[selected.level]}</span>
                  <span className="tag tag-gray">{selected.platform}用户</span>
                </div>
              </div>

              <div className="d-section">
                <div className="ds-t">🎬 来源视频</div>
                <div className="comment-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 74, height: 52, borderRadius: 8, flex: 'none',
                    background: 'linear-gradient(135deg,#3b2a6b,#241a45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                  }}>
                    🎬
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.srcVideo}</div>
                    <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 3 }}>
                      @{selected.srcAuthor} · {selected.platform}
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-section">
                <div className="ds-t">✨ AI 推荐回复</div>
                <div className="d-reply-hint">
                  根据「{selected.industry}」与该条评论命中的购买信号自动生成
                </div>
                {(replies === null ? generateReplies(selected) : replies).map((r) => (
                  <div className="reply-card" key={r.key}>
                    <div className="rc-head">
                      <span className="rc-label">{r.label}</span>
                      <span className="rc-tone">{r.tone}</span>
                      <button className="rc-copy" onClick={() => copyText(r.text, selected.id + r.key)}>
                        {copied === selected.id + r.key ? '✓ 已复制' : '复制'}
                      </button>
                    </div>
                    <div className="rc-text">{r.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="d-actions">
              <button
                className="btn btn-ghost"
                onClick={() => markLater(selected.id) || setSelected({ ...selected, later: !selected.later })}
              >
                {selected.later ? '取消稍后跟进' : '稍后跟进'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  markFollowed(selected.id)
                  setSelected({ ...selected, followed: true })
                }}
                disabled={selected.followed}
              >
                {selected.followed ? '✓ 已标记跟进' : '标记已跟进'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== 新客户流入提示 ===== */}
      {toast && (
        <div className="live-toast" key={toast.id}>
          <div className="lt-ico">🎯</div>
          <div>
            <div className="lt-t">采集到 1 位新客户</div>
            <div className="lt-d">
              {toast.nick} · {toast.industry} · {toast.platform} · 意向 {toast.score}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
