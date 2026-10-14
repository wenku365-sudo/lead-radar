import React, { useEffect, useState } from 'react'
import { useApp } from '../App.jsx'
import { splitKeywords } from '../data/mock.js'

const SIGNAL_POOL = [
  { ico: '🔍', bg: 'rgba(99,102,241,0.22)', text: '搜索关键词「<b>家具购买需求</b>」，命中 128 条视频' },
  { ico: '▶️', bg: 'rgba(224,41,59,0.2)', text: '打开视频「90平小户型全屋定制避坑指南」，正在翻阅评论区' },
  { ico: '💬', bg: 'rgba(34,197,94,0.18)', text: '发现高意向评论：<b>这套家具怎么收费？最近正在装修</b>' },
  { ico: '🎯', bg: 'rgba(234,115,23,0.2)', text: '客户 <b>小满不吃香菜</b> 意向评分 92，已加入线索池' },
  { ico: '🔍', bg: 'rgba(99,102,241,0.22)', text: '搜索关键词「<b>少儿编程怎么学</b>」，命中 96 条视频' },
  { ico: '💬', bg: 'rgba(34,197,94,0.18)', text: '发现高意向评论：<b>试听课怎么报名？想带娃体验</b>' },
  { ico: '▶️', bg: 'rgba(224,41,59,0.2)', text: '打开视频「3个月私教减脂28斤」，评论 5600 条' },
  { ico: '🎯', bg: 'rgba(234,115,23,0.2)', text: '客户 <b>奔跑的蜗牛</b> 意向评分 88，已加入线索池' },
  { ico: '💬', bg: 'rgba(34,197,94,0.18)', text: '发现高意向评论：<b>全包装修价格多少一平？</b>' },
  { ico: '🔍', bg: 'rgba(99,102,241,0.22)', text: '搜索关键词「<b>二手房 学区</b>」，命中 214 条视频' },
  { ico: '🎯', bg: 'rgba(234,115,23,0.2)', text: '客户 <b>桃桃乌龙</b> 意向评分 95，已加入线索池' },
  { ico: '💬', bg: 'rgba(34,197,94,0.18)', text: '发现高意向评论：<b>这车还能置换吗？想换台新的</b>' }
]

function SignalPanel() {
  const [items, setItems] = useState(() =>
    SIGNAL_POOL.slice(0, 4).map((s, i) => ({ ...s, key: i, time: `${8 + i * 3} 秒前` }))
  )
  useEffect(() => {
    let n = 4
    const timer = setInterval(() => {
      setItems((prev) => {
        const s = SIGNAL_POOL[n % SIGNAL_POOL.length]
        n++
        return [{ ...s, key: n, time: '刚刚' }, ...prev].slice(0, 5)
      })
    }, 2600)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="signal-panel">
      <div className="signal-panel-head">
        <div className="t">
          <span className="pulse-dot" style={{ background: '#22c55e' }} />
          实时获客信号 · LIVE
        </div>
        <span style={{ fontSize: 12, color: '#767d99', fontFamily: 'DM Sans' }}>RADAR v2.6</span>
      </div>
      <div className="signal-feed">
        {items.map((s) => (
          <div className="signal-item" key={s.key}>
            <div className="ico" style={{ background: s.bg }}>{s.ico}</div>
            <div>
              <div className="txt" dangerouslySetInnerHTML={{ __html: s.text }} />
              <div className="time">{s.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Counter({ to, suffix }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 1400)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{n.toLocaleString()}{suffix}</>
}

export default function Home() {
  const { go, customers } = useApp()
  const avg = customers.length
    ? Math.round(customers.reduce((s, c) => s + c.score, 0) / customers.length)
    : 0

  const sample = customers.find((c) => c.comment.includes('怎么收费'))

  return (
    <div>
      {/* ===== 深色大首屏 ===== */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-inner">
          <div>
            <div className="hero-badge">
              <span className="pulse-dot" />
              AI 自动获客 · 演示版
            </div>
            <h1>
              <span className="accent">自动获客</span>
              <br />
              AI 获客
              <br />
              让客户主动出现
            </h1>
            <p className="hero-sub">
              用一句话交代任务，AI 自动发现公开内容中的购买意向。
              搜索视频 → 打开详情 → 翻阅评论 → 筛出意向客户，全程自动。
            </p>
            <div className="hero-btns">
              <button className="btn-hero-primary" onClick={() => go('task')}>
                开始 AI 获客 →
              </button>
              <button className="btn-hero-ghost" onClick={() => go('workbench')}>
                进入工作台
              </button>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="num"><Counter to={372} /></div>
                <div className="lbl">已发现线索（累计）</div>
              </div>
              <div className="hero-stat">
                <div className="num"><Counter to={avg} /><em>分</em></div>
                <div className="lbl">平均意向分</div>
              </div>
              <div className="hero-stat">
                <div className="num">
                  <Counter to={7} />
                  <em>× 24h</em>
                </div>
                <div className="lbl">持续监控任务</div>
              </div>
            </div>
          </div>
          <SignalPanel />
        </div>
      </section>

      {/* ===== 流转关系 ===== */}
      <section className="flow-section">
        <div className="flow-inner">
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13.5, letterSpacing: 2 }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>
              从一个搜索词，到一位意向客户
            </h2>
            <p style={{ color: '#9aa1bd', marginTop: 10, fontSize: 15 }}>
              搜索词、视频、评论、意向客户之间的流转关系
            </p>
          </div>
          <div className="flow-chain">
            <div className="flow-node">
              <span className="fi">🔍</span>
              <div className="ft">搜索词</div>
              <div className="fd">一句话交代任务，AI 拆解为搜索关键词，覆盖抖音、小红书公开视频</div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-node">
              <span className="fi">🎬</span>
              <div className="ft">视频</div>
              <div className="fd">自动匹配相关视频，逐个打开详情页，理解视频内容与受众</div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-node">
              <span className="fi">💬</span>
              <div className="ft">评论</div>
              <div className="fd">逐条翻阅评论区，识别咨询、比价、预约等购买信号关键词</div>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-node" style={{ borderColor: 'rgba(139,92,246,0.5)', background: 'rgba(124,58,237,0.12)' }}>
              <span className="fi">🎯</span>
              <div className="ft" style={{ color: '#a78bfa' }}>意向客户</div>
              <div className="fd">为每位客户计算意向评分，高意向线索直接进入你的客户池</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 五步流程 ===== */}
      <section className="steps-section">
        <div className="steps-inner">
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#7c3aed', fontWeight: 700, fontSize: 13.5, letterSpacing: 2 }}>
              FULL PIPELINE
            </div>
            <h2 style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>五步，从任务到客户</h2>
            <p style={{ color: '#6b7280', marginTop: 10, fontSize: 15 }}>
              你只负责交代任务，剩下的交给 AI
            </p>
          </div>
          <div className="step-row">
            <div className="step-card">
              <div className="step-num">1</div>
              <div className="st">一句话交代任务</div>
              <div className="sd">「帮我找需要买家具的客户」——像给助理安排工作一样自然</div>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <div className="st">AI 搜索视频</div>
              <div className="sd">自动在抖音、小红书检索相关公开视频，批量匹配内容</div>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <div className="st">打开视频</div>
              <div className="sd">模拟真人浏览，逐个打开视频详情，获取完整互动数据</div>
            </div>
            <div className="step-card">
              <div className="step-num">4</div>
              <div className="st">翻阅评论</div>
              <div className="sd">逐条采集评论，实时识别收费、优惠、报名等购买信号</div>
            </div>
            <div className="step-card">
              <div className="step-num">5</div>
              <div className="st">筛选意向客户</div>
              <div className="sd">意向评分 + AI 标签，高意向客户自动沉淀到线索池</div>
            </div>
          </div>

          {sample && (
            <div
              style={{
                marginTop: 40,
                background: '#0e1120',
                borderRadius: 14,
                padding: '26px 30px',
                display: 'flex',
                gap: 22,
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ fontSize: 13, color: '#8b92ad' }}>示例 · 刚刚发现的高意向评论</div>
              <div style={{ flex: 1, minWidth: 240, color: '#fff', fontSize: 16.5, fontWeight: 700 }}>
                “
                {splitKeywords(sample.comment).map((p, i) =>
                  p.kw ? (
                    <span key={i} style={{ color: '#ff6b5c' }}>{p.t}</span>
                  ) : (
                    <span key={i}>{p.t}</span>
                  )
                )}
                ”
              </div>
              <span className="tag tag-red" style={{ fontSize: 13, padding: '5px 13px' }}>
                意向评分 {sample.score} · {sample.industry} · {sample.platform}
              </span>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <button className="btn btn-primary btn-lg" onClick={() => go('task')}>
              立即开始 AI 获客 →
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
