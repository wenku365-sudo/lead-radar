import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../App.jsx'
import { INDUSTRIES, splitKeywords, levelName, generateReplies, FOLLOW_STATUS } from '../data/mock.js'

function KwText({ text }) {
  return (
    <>
      {splitKeywords(text).map((p, i) =>
        p.kw ? <span key={i} className="kw">{p.t}</span> : <span key={i}>{p.t}</span>
      )}
    </>
  )
}

const stOf = (c) => c.followStatus || 'todo'

export default function Followup() {
  const { customers, setFollowStatus, setNote, markLater, go } = useApp()
  const [tab, setTab] = useState('all')
  const [ind, setInd] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [copied, setCopied] = useState(null)

  const counts = useMemo(() => {
    const m = { todo: 0, contacted: 0, visited: 0, deal: 0 }
    for (const c of customers) {
      const s = stOf(c)
      if (m[s] !== undefined) m[s]++
    }
    return m
  }, [customers])

  const total = customers.length
  const funnel = [
    { label: '已发现客户', n: total, color: '#7c3aed' },
    { label: '已联系', n: counts.contacted + counts.visited + counts.deal, color: '#378ADD' },
    { label: '已到店', n: counts.visited + counts.deal, color: '#a78bfa' },
    { label: '已成交', n: counts.deal, color: '#12915f' }
  ]

  // 今日优先跟进：高意向且尚未联系，按意向分倒序
  const priority = useMemo(
    () =>
      customers
        .filter((c) => stOf(c) === 'todo' && !c.later)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6),
    [customers]
  )

  const list = useMemo(() => {
    return customers.filter((c) => {
      if (ind !== 'all' && c.industryKey !== ind) return false
      const s = stOf(c)
      if (tab === 'later') return !!c.later && s !== 'deal'
      if (tab !== 'all' && s !== tab) return false
      return true
    })
  }, [customers, ind, tab])

  const copy = (text, key) => {
    try {
      navigator.clipboard?.writeText(text)
    } catch (e) {
      /* 忽略：演示环境可能无剪贴板权限 */
    }
    setCopied(key)
    setTimeout(() => setCopied(null), 1600)
  }

  const openNote = (c) => {
    setOpenId(c.id)
    setNoteDraft(c.note || '')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">跟进工作台</div>
          <div className="page-sub">
            从「找到客户」到「转化成交」——AI 生成回复话术，跟进状态全程可追溯
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => go('customers')}>
          去意向客户页筛选 →
        </button>
      </div>

      {/* ===== 状态统计 ===== */}
      <div className="fu-stats">
        {FOLLOW_STATUS.map((s) => (
          <div className={'fu-stat fu-stat-' + s.color} key={s.key}>
            <div className="n">{counts[s.key]}</div>
            <div className="l">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ===== 转化漏斗 ===== */}
      <div className="fu-card">
        <div className="fu-card-t">转化漏斗</div>
        {funnel.map((f) => (
          <div className="fu-funnel" key={f.label}>
            <div className="ff-l">{f.label}</div>
            <div className="ff-bar">
              <i style={{ width: (total ? (f.n / total) * 100 : 0) + '%', background: f.color }} />
            </div>
            <div className="ff-n">
              {f.n}
              <em>人</em>
            </div>
            <div className="ff-p">{total ? Math.round((f.n / total) * 100) : 0}%</div>
          </div>
        ))}
      </div>

      {/* ===== 今日优先跟进 ===== */}
      <div className="fu-card">
        <div className="fu-card-t">
          ⚡ 今日优先跟进
          <span className="fu-card-sub">高意向且尚未联系，AI 已备好回复话术</span>
        </div>
        {priority.length === 0 ? (
          <div className="empty-state">暂无待跟进的高意向客户，去意向客户页看看实时流入的新线索</div>
        ) : (
          <div className="fu-priority">
            {priority.map((c) => {
              const open = openId === c.id
              return (
                <div className="fp-item" key={c.id}>
                  <div className="fp-head">
                    <div className="fp-who">
                      <div className="cust-avatar" style={{ background: c.avatarColor }}>{c.nick[0]}</div>
                      <div>
                        <div className="fp-nick">
                          {c.nick}
                          <span className={'tag ' + (c.platform === '抖音' ? 'tag-gray' : 'tag-red')} style={{ marginLeft: 7, fontSize: 11 }}>
                            {c.platform}
                          </span>
                        </div>
                        <div className="fp-meta">
                          {c.industry} · {levelName[c.level]} · {c.time}
                        </div>
                      </div>
                    </div>
                    <span className={'score-pill ' + (c.level === 'high' ? 'score-high' : c.level === 'mid' ? 'score-mid' : 'score-low')}>
                      {c.score}
                    </span>
                  </div>

                  <div className="fp-comment">
                    <KwText text={c.comment} />
                  </div>

                  <div className="fp-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(open ? null : c.id)}>
                      {open ? '收起话术' : '✨ AI 回复话术'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setFollowStatus(c.id, 'contacted')}>
                      标记已联系
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => markLater(c.id)}>
                      稍后跟进
                    </button>
                  </div>

                  {open && <PriorityReplies c={c} copied={copied} copy={copy} />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== 全部跟进 ===== */}
      <div className="fu-card">
        <div className="fu-card-t">全部跟进记录</div>

        <div className="fu-filters">
          <div className="fu-tabs">
            {[{ key: 'all', label: '全部' }, ...FOLLOW_STATUS.map((s) => ({ key: s.key, label: s.label })), { key: 'later', label: '稍后跟进' }].map((t) => (
              <button
                key={t.key}
                className={'fu-tab' + (tab === t.key ? ' on' : '')}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select className="fu-select" value={ind} onChange={(e) => setInd(e.target.value)}>
            <option value="all">全部行业</option>
            {INDUSTRIES.map((i) => (
              <option key={i.key} value={i.key}>{i.name}</option>
            ))}
          </select>
        </div>

        {list.length === 0 ? (
          <div className="empty-state">当前筛选条件下没有客户，试试切换行业或状态</div>
        ) : (
          <div className="fu-list">
            {list.slice(0, 60).map((c) => {
              const s = stOf(c)
              return (
                <div className="fu-row" key={c.id}>
                  <div className="fu-row-h">
                    <div className="fp-who">
                      <div className="cust-avatar" style={{ background: c.avatarColor }}>{c.nick[0]}</div>
                      <div>
                        <div className="fp-nick">{c.nick}</div>
                        <div className="fp-meta">
                          {c.industry} · {c.platform} · 意向 {c.score}
                        </div>
                      </div>
                    </div>

                    <div className="fu-stepper">
                      {FOLLOW_STATUS.map((st, i) => {
                        const cur = FOLLOW_STATUS.findIndex((x) => x.key === s)
                        const done = i <= cur
                        return (
                          <button
                            key={st.key}
                            className={'fs-btn' + (done ? ' done' : '') + (i === cur ? ' cur' : '')}
                            onClick={() => setFollowStatus(c.id, st.key)}
                            title={`标记为${st.label}`}
                          >
                            {st.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="fu-comment">
                    <KwText text={c.comment} />
                  </div>

                  <div className="fu-note-row">
                    <button className="btn btn-ghost btn-sm" onClick={() => openNote(c)}>
                      {c.note ? '✎ 修改备注' : '＋ 添加备注'}
                    </button>
                    {c.note && <span className="fu-note-txt">{c.note}</span>}
                    {c.later && <span className="tag tag-gray">稍后跟进</span>}
                    <span className="fu-src">🎬 {c.srcVideo}</span>
                  </div>

                  {openId === c.id && (
                    <div className="fu-note-edit">
                      <textarea
                        className="fu-textarea"
                        rows={2}
                        placeholder="记录跟进情况，例如：已加微信，约周六下午到店量房"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                      />
                      <div className="fu-note-btns">
                        <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(null)}>取消</button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setNote(c.id, noteDraft)
                            setOpenId(null)
                          }}
                        >
                          保存备注
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {list.length > 60 && (
          <div className="fu-more">共 {list.length} 条，已展示前 60 条（可用上方筛选缩小范围）</div>
        )}
      </div>
    </div>
  )
}

/** 优先跟进卡片的话术区：在线模式走后端（可接大模型），失败回退本地模板 */
function PriorityReplies({ c, copied, copy }) {
  const { getReplies } = useApp()
  const [replies, setReplies] = useState(null)

  useEffect(() => {
    let cancelled = false
    setReplies(null)
    getReplies(c)
      .then((r) => {
        if (!cancelled) setReplies(r)
      })
      .catch(() => {
        if (!cancelled) setReplies(generateReplies(c))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id])

  if (replies === null) {
    return (
      <div className="fp-replies" style={{ color: 'var(--gray)', fontSize: 13, padding: '4px 2px' }}>
        AI 正在生成话术…
      </div>
    )
  }
  return (
    <div className="fp-replies">
      {replies.map((r) => (
        <div className="reply-card" key={r.key}>
          <div className="rc-head">
            <span className="rc-label">{r.label}</span>
            <span className="rc-tone">{r.tone}</span>
            <button className="rc-copy" onClick={() => copy(r.text, c.id + r.key)}>
              {copied === c.id + r.key ? '✓ 已复制' : '复制'}
            </button>
          </div>
          <div className="rc-text">{r.text}</div>
        </div>
      ))}
    </div>
  )
}
