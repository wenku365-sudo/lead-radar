import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../App.jsx'
import { INDUSTRIES, splitKeywords, levelName, makeLiveCustomer } from '../data/mock.js'

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
  const { customers, markFollowed, markLater, addCustomer } = useApp()
  const [ind, setInd] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [level, setLevel] = useState('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)

  // ===== 实时采集动效状态 =====
  const [live, setLive] = useState(true)
  const [speed, setSpeed] = useState(2800)
  const [freshIds, setFreshIds] = useState([])   // 高亮中的新数据（约 6 秒后淡出）
  const [sessionNew, setSessionNew] = useState(0) // 本次停留新增
  const [toast, setToast] = useState(null)        // 右下角浮动提示
  const [lastAt, setLastAt] = useState(null)

  // 用 ref 持有最新筛选条件，避免定时器被反复重建
  const cfg = useRef({})
  cfg.current = { ind, platform, level, q, addCustomer }

  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => {
      const { ind: ci, platform: cp, level: cl, q: cq, addCustomer: add } = cfg.current
      const c = makeLiveCustomer({
        industryKey: ci === 'all' ? undefined : ci,
        platform: cp === 'all' ? undefined : cp,
        level: cl === 'all' ? undefined : cl,
        q: cq || undefined
      })
      add(c)
      setSessionNew((n) => n + 1)
      setLastAt(new Date())
      setFreshIds((f) => [...f, c.id])
      setToast({ id: c.id, nick: c.nick, industry: c.industry, score: c.score, platform: c.platform })

      // 高速档位下缩短高亮与提示时长，避免整屏泛绿 / 提示堆叠
      const freshMs = speed < 900 ? 2000 : 6000
      const toastMs = speed < 900 ? 1500 : 3000

      // 高亮结束后移除（列表滚动/重新渲染不会中断）
      setTimeout(() => setFreshIds((f) => f.filter((x) => x !== c.id)), freshMs)
      // 提示自动消失
      setTimeout(() => setToast((t) => (t && t.id === c.id ? null : t)), toastMs)
    }, speed)
    return () => clearInterval(timer)
  }, [live, speed])

  const indCounts = useMemo(() => {
    const m = {}
    for (const c of customers) m[c.industryKey] = (m[c.industryKey] || 0) + 1
    return m
  }, [customers])

  const list = useMemo(() => {
    return customers.filter((c) => {
      if (ind !== 'all' && c.industryKey !== ind) return false
      if (platform !== 'all' && c.platform !== platform) return false
      if (level !== 'all' && c.level !== level) return false
      if (q && !c.comment.includes(q) && !c.nick.includes(q)) return false
      return true
    })
  }, [customers, ind, platform, level, q])

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
                  ? (ind === 'all' ? '全部行业' : INDUSTRIES.find((i) => i.key === ind)?.name + ' · ') +
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
          {SPEEDS.map((s) => (
            <button
              key={s.v}
              className={'spd-btn' + (speed === s.v ? ' on' : '')}
              onClick={() => setSpeed(s.v)}
            >
              {s.label}
            </button>
          ))}
          <button className="btn btn-sm" style={{ background: live ? '#fff' : 'var(--purple)', color: live ? 'var(--ink-2)' : '#fff', border: '1px solid var(--line)' }} onClick={() => setLive(!live)}>
            {live ? '⏸ 暂停' : '▶ 继续采集'}
          </button>
        </div>
      </div>
      <div className="live-scan-wrap">
        <div className={'live-scan' + (live ? ' on' : '')} />
      </div>

      {/* 筛选工具栏 */}
      <div className="card cust-toolbar">
        <div className="ind-tabs">
          <button className={'ind-tab' + (ind === 'all' ? ' active' : '')} onClick={() => setInd('all')}>
            全部<span className="cnt">{customers.length}</span>
          </button>
          {INDUSTRIES.map((i) => (
            <button key={i.key} className={'ind-tab' + (ind === i.key ? ' active' : '')} onClick={() => setInd(i.key)}>
              {i.emoji} {i.name}
              <span className="cnt">{indCounts[i.key] || 0}</span>
            </button>
          ))}
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
            筛选结果 {list.length} 条
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
            <div className="eico">🔍</div>
            <div className="et">没有找到匹配的客户</div>
            <div className="ed">试试更换行业、平台或搜索关键词，或点击右上角「重置筛选」</div>
          </div>
        ) : (
          list.map((c) => {
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
