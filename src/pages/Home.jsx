import React, { useEffect, useState } from 'react'
import { useApp } from '../App.jsx'
import { splitKeywords, INDUSTRIES } from '../data/mock.js'

/* ============ 实时获客信号面板 ============ */
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
      <div className="signal-foot">
        <span><b>2</b> 个平台同时扫描</span>
        <span className="sep" />
        <span>本轮已处理 <b className="hl">428</b> 条评论</span>
      </div>
    </div>
  )
}

/* ============ 数字滚动 ============ */
function Counter({ to, suffix, dur = 1400 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, dur])
  return <>{n.toLocaleString()}{suffix}</>
}

/* 滚动进入视口时才触发动画的数字 */
function Metric({ to, suffix, label, sub }) {
  return (
    <div className="metric">
      <div className="metric-num"><Counter to={to} suffix={suffix} dur={1600} /></div>
      <div className="metric-label">{label}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

/* ============ 平台 / 覆盖带 ============ */
function PlatformStrip() {
  const items = [
    { n: '抖音', d: '公开视频 · 评论区' },
    { n: '小红书', d: '公开笔记 · 评论区' },
    { n: '7 大行业', d: '家具 / 装修 / 医美 / 教育等' },
    { n: '24 小时', d: '任务持续监控' },
    { n: '0 行代码', d: '一句话交代任务即可' }
  ]
  return (
    <div className="strip">
      <div className="strip-inner">
        <div className="strip-label">覆盖平台与能力</div>
        <div className="strip-items">
          {items.map((x) => (
            <div className="strip-item" key={x.n}>
              <div className="sn">{x.n}</div>
              <div className="sd">{x.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ============ 核心能力 ============ */
const FEATURES = [
  {
    ico: '🧠',
    t: 'AI 语义理解',
    d: '把「帮我找需要买家具的客户」自动拆解为目标人群、搜索范围与重点识别关键词，不需要你配置任何规则。',
    tag: '一句话即任务'
  },
  {
    ico: '🌐',
    t: '双平台覆盖',
    d: '同时检索抖音与小红书的公开视频，批量匹配内容，不遗漏任何一个正在讨论你产品的评论区。',
    tag: '抖音 + 小红书'
  },
  {
    ico: '🎯',
    t: '意向评分引擎',
    d: '对每条评论计算 0-100 意向分，自动区分高意向 / 中意向 / 待确认，高意向线索优先推送给你。',
    tag: '0-100 分'
  },
  {
    ico: '⚡',
    t: '实时采集流',
    d: '新客户以秒级速度持续流入线索池，列表实时插入、数字实时跳动，整个获客过程肉眼可见。',
    tag: '秒级流入'
  },
  {
    ico: '🏷️',
    t: '智能标签',
    d: '自动打上「价格敏感」「近期装修」「同城」等标签，关键词在原文中高亮，一眼看懂客户在问什么。',
    tag: '自动归类'
  },
  {
    ico: '📇',
    t: '线索沉淀',
    d: '客户昵称、平台、评论原文、来源视频、发现时间全量留档，支持稍后跟进与已跟进标记。',
    tag: '可追溯'
  }
]

function Features() {
  return (
    <section className="sec sec-light">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow">CORE CAPABILITIES</div>
          <h2>把「找客户」这件事，交给 AI</h2>
          <p>
            传统获客靠人肉翻评论区，一天看不了几十条。线索雷达把搜索、浏览、阅读、判断四件事全部自动化。
          </p>
        </div>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <div className="feat-card" key={f.t}>
              <div className="feat-ico">{f.ico}</div>
              <div className="feat-tag">{f.tag}</div>
              <div className="feat-t">{f.t}</div>
              <div className="feat-d">{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============ 流转关系 ============ */
function Flow() {
  const nodes = [
    { ico: '🔍', t: '搜索词', d: '一句话交代任务，AI 拆解为搜索关键词，覆盖抖音、小红书公开视频' },
    { ico: '🎬', t: '视频', d: '自动匹配相关视频，逐个打开详情页，理解视频内容与受众' },
    { ico: '💬', t: '评论', d: '逐条翻阅评论区，识别咨询、比价、预约等购买信号关键词' },
    { ico: '🎯', t: '意向客户', d: '为每位客户计算意向评分，高意向线索直接进入你的客户池' }
  ]
  return (
    <section className="sec sec-dark">
      <div className="sec-inner">
        <div className="sec-head center">
          <div className="eyebrow purple">HOW IT WORKS</div>
          <h2 className="light">从一个搜索词，到一位意向客户</h2>
          <p className="light-sub">搜索词、视频、评论、意向客户之间的流转关系</p>
        </div>
        <div className="flow-chain">
          {nodes.map((n, i) => (
            <React.Fragment key={n.t}>
              <div className={'flow-node' + (i === 3 ? ' flow-node-hl' : '')}>
                <span className="fi">{n.ico}</span>
                <div className="ft">{n.t}</div>
                <div className="fd">{n.d}</div>
              </div>
              {i < 3 && <div className="flow-arrow"><span className="beam" />→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============ 产品演示（Tab 切换） ============ */
const SHOTS = [
  { key: 'task', label: '① AI 交代任务', cap: '像给助理安排工作一样，一句话交代获客任务' },
  { key: 'collect', label: '② 采集动画', cap: '模拟真人浏览：搜索 → 打开视频 → 逐条翻阅评论' },
  { key: 'pool', label: '③ 意向客户池', cap: '高意向客户自动沉淀，支持筛选与跟进' }
]

function MiniTask() {
  return (
    <div className="mini">
      <div className="mini-bar"><span />AI 获客助手</div>
      <div className="mini-body">
        <div className="bubble me">帮我找需要买家具的客户</div>
        <div className="bubble ai">
          <div className="ai-t">已理解你的获客任务</div>
          <div className="ai-row"><span>目标客户</span><b>家具购买需求</b></div>
          <div className="ai-row"><span>搜索范围</span><b>抖音 + 小红书公开视频</b></div>
          <div className="ai-row"><span>重点识别</span><b>怎么收费 / 优惠 / 推荐 / 价格</b></div>
          <div className="ai-row"><span>预计发现</span><b>128 个视频 · 约 46 位客户</b></div>
        </div>
      </div>
    </div>
  )
}

function MiniCollect() {
  return (
    <div className="mini">
      <div className="mini-bar">
        <span />douyin.com/search/家具购买需求
      </div>
      <div className="mini-body mini-body-2">
        <div className="mini-video">
          <div className="mini-cover">🛋️</div>
          <div className="mini-vt">90平小户型全屋定制避坑指南</div>
          <div className="mini-vmeta">👍 3.2万 &nbsp; 💬 5,612</div>
          <div className="mini-prog"><i style={{ width: '72%' }} /></div>
        </div>
        <div className="mini-comments">
          {[
            { t: '这套家具怎么收费？最近正在装修。', s: 92, st: 'done' },
            { t: '有没有适合小户型的优惠方案？', s: 88, st: 'done' },
            { t: '坐标杭州，推荐哪种材质比较环保？', s: 76, st: 'done' },
            { t: '想下个月入住，现在报名还来得及吗？', s: 95, st: 'ing' },
            { t: '有线下门店吗？可以先去看看吗？', s: 71, st: 'wait' }
          ].map((c, i) => (
            <div className={'mini-cm ' + c.st} key={i}>
              <span className="mk">{c.st === 'done' ? '✓' : c.st === 'ing' ? '···' : '○'}</span>
              <span className="mt">{c.t}</span>
              <span className="ms">{c.s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniPool() {
  return (
    <div className="mini">
      <div className="mini-bar"><span />意向客户 · 实时流入</div>
      <div className="mini-body">
        <div className="mini-stats">
          <div><b>372</b><span>累计客户</span></div>
          <div><b>68</b><span>今日新增</span></div>
          <div><b>84</b><span>平均意向分</span></div>
        </div>
        <div className="mini-table">
          <div className="mini-th">
            <span>客户</span><span>评论</span><span>评分</span>
          </div>
          {[
            { n: '小满不吃香菜', p: '抖音', t: '这套家具怎么收费？最近正在装修', s: 92 },
            { n: '桃桃乌龙', p: '小红书', t: '试听课怎么报名？想带娃体验一下', s: 95 },
            { n: '奔跑的蜗牛', p: '抖音', t: '全包装修价格多少一平？', s: 88 },
            { n: '阿岚', p: '小红书', t: '这车还能置换吗？贷款好办吗', s: 90 }
          ].map((r, i) => (
            <div className="mini-tr" key={i}>
              <span className="mn"><i style={{ background: ['#7c3aed', '#e0293b', '#12915f', '#ea7317'][i] }}>{r.n[0]}</i>{r.n}</span>
              <span className="mt2">{r.t}</span>
              <span className={'ms2 ' + (r.s >= 85 ? 'hi' : 'mid')}>{r.s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Showcase() {
  const [k, setK] = useState('task')
  return (
    <section className="sec sec-light">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow">PRODUCT TOUR</div>
          <h2>三步，看清 AI 是怎么找到客户的</h2>
          <p>整个采集过程完全可视 —— 你看到的不是结果，而是 AI 干活的全过程。</p>
        </div>
        <div className="shot-tabs">
          {SHOTS.map((s) => (
            <button
              key={s.key}
              className={'shot-tab' + (k === s.key ? ' on' : '')}
              onClick={() => setK(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="shot-stage">
          {k === 'task' && <MiniTask />}
          {k === 'collect' && <MiniCollect />}
          {k === 'pool' && <MiniPool />}
        </div>
        <div className="shot-cap">{SHOTS.find((s) => s.key === k).cap}</div>
      </div>
    </section>
  )
}

/* ============ 五步流程 ============ */
function Steps({ sample }) {
  const steps = [
    { t: '一句话交代任务', d: '「帮我找需要买家具的客户」——像给助理安排工作一样自然' },
    { t: 'AI 搜索视频', d: '自动在抖音、小红书检索相关公开视频，批量匹配内容' },
    { t: '打开视频', d: '模拟真人浏览，逐个打开视频详情，获取完整互动数据' },
    { t: '翻阅评论', d: '逐条采集评论，实时识别收费、优惠、报名等购买信号' },
    { t: '筛选意向客户', d: '意向评分 + AI 标签，高意向客户自动沉淀到线索池' }
  ]
  return (
    <section className="sec sec-gray">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow">FULL PIPELINE</div>
          <h2>五步，从任务到客户</h2>
          <p>你只负责交代任务，剩下的交给 AI。</p>
        </div>
        <div className="step-row">
          {steps.map((s, i) => (
            <div className="step-card" key={s.t}>
              <div className="step-num">{i + 1}</div>
              <div className="st">{s.t}</div>
              <div className="sd">{s.d}</div>
            </div>
          ))}
        </div>

        {sample && (
          <div className="quote-card">
            <div className="qc-label">示例 · 刚刚发现的高意向评论</div>
            <div className="qc-text">
              “
              {splitKeywords(sample.comment).map((p, i) =>
                p.kw ? <span key={i} className="kw">{p.t}</span> : <span key={i}>{p.t}</span>
              )}
              ”
            </div>
            <span className="tag tag-red" style={{ fontSize: 13, padding: '5px 13px' }}>
              意向评分 {sample.score} · {sample.industry} · {sample.platform}
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

/* ============ 指标带 ============ */
function Metrics() {
  return (
    <section className="sec sec-deep">
      <div className="sec-inner">
        <div className="sec-head center">
          <div className="eyebrow purple">BY THE NUMBERS</div>
          <h2 className="light">获客效率，肉眼可见的提升</h2>
        </div>
        <div className="metric-row">
          <Metric to={372} suffix="+" label="累计意向客户" sub="7 大行业持续沉淀" />
          <Metric to={428} label="单轮翻阅评论" sub="相当于人工 6 小时" />
          <Metric to={84} suffix=" 分" label="平均意向评分" sub="高意向占比 31%" />
          <Metric to={24} suffix=" h" label="任务持续监控" sub="无需人工值守" />
        </div>
      </div>
    </section>
  )
}

/* ============ 行业覆盖 ============ */
function Industry() {
  return (
    <section className="sec sec-light">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow">INDUSTRY COVERAGE</div>
          <h2>已覆盖 7 个高频获客行业</h2>
          <p>每个行业都配好了真实感的客户样本，切换即可查看对应话术与意向分布。</p>
        </div>
        <div className="ind-grid">
          {INDUSTRIES.map((it) => (
            <div className="ind-card" key={it.key}>
              <div className="ind-n">{it.name}</div>
              <div className="ind-c"><b>{it.count}</b> 条客户样本</div>
              <div className="ind-bar"><i style={{ width: Math.min(100, (it.count / 82) * 100) + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============ 对比 ============ */
function Compare() {
  return (
    <section className="sec sec-gray">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow">WHY SWITCH</div>
          <h2>和传统获客方式，差在哪</h2>
        </div>
        <div className="cmp">
          <div className="cmp-col cmp-old">
            <div className="cmp-h">❌ 传统方式</div>
            {[
              '人工搜索关键词，一条条翻',
              '一天看几十条评论就到极限',
              '凭感觉判断谁有购买意向',
              '客户信息散落在各个平台',
              '换个行业就要重来一遍'
            ].map((x) => <div className="cmp-i" key={x}>{x}</div>)}
          </div>
          <div className="cmp-arrow">VS</div>
          <div className="cmp-col cmp-new">
            <div className="cmp-h">✅ 线索雷达</div>
            {[
              '一句话交代任务，AI 自动拆解',
              '单轮翻阅 400+ 条评论，可持续跑',
              '0-100 意向评分，高意向优先',
              '客户 + 原文 + 来源视频全量留档',
              '换行业只需改一句话'
            ].map((x) => <div className="cmp-i" key={x}>{x}</div>)}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ============ 用户评价 ============ */
const QUOTES = [
  { n: '某全屋定制品牌 · 市场负责人', t: '以前三个人翻评论区，现在一个人管七个行业的线索池，高意向客户第一时间就推过来了。', s: '线索响应从 2 天 → 30 分钟' },
  { n: '少儿编程机构 · 招生主管', t: '最惊喜的是关键词高亮，家长到底在问价格还是在问校区，扫一眼就知道该回什么。', s: '试听转化率提升 41%' },
  { n: '本地医美机构 · 运营', t: '「多少钱」「预约」这类信号自动标红，我们再也不会漏掉真正想下单的人。', s: '月均新增有效线索 260+' }
]

function Testimonials() {
  return (
    <section className="sec sec-light">
      <div className="sec-inner">
        <div className="sec-head">
          <div className="eyebrow">WHAT THEY SAY</div>
          <h2>用过的人怎么说</h2>
        </div>
        <div className="quote-grid">
          {QUOTES.map((q) => (
            <div className="quote-item" key={q.n}>
              <div className="q-stars">★★★★★</div>
              <div className="q-t">“{q.t}”</div>
              <div className="q-n">{q.n}</div>
              <div className="q-s">📈 {q.s}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============ FAQ ============ */
const FAQ = [
  { q: '这是真实抓取抖音、小红书数据吗？', a: '不是。这是一个纯前端演示项目，全部数据为本地 mock 样本，不连接任何真实平台、不调用任何外部接口、不做任何爬虫行为。页面中的视频、评论、客户均为演示用虚构内容。' },
  { q: '需要注册登录吗？需要付费吗？', a: '不需要。打开即可使用，无登录、无账号、无后端、无数据库，所有状态保存在浏览器内存中，刷新即重置。' },
  { q: '「一句话交代任务」AI 是怎么理解的？', a: '系统会根据你输入的自然语言，匹配出目标人群、搜索范围与重点识别关键词（如怎么收费、优惠、推荐、报名、价格等），并给出预计发现的视频数与客户数，整个过程在本地完成。' },
  { q: '采集动画能重复看吗？', a: '可以。在「采集数据」页点击任意任务的「立即采集」，即可重新播放约 22 秒的四阶段采集动画，弹窗不会自动关闭，方便现场讲解。' },
  { q: '支持哪些行业？', a: '当前内置 7 个行业共 372 条客户样本：家具 40 / 少儿编程 40 / 私教减脂 40 / 装修 55 / 医美 68 / 二手房 82 / 二手车 47，可在「意向客户」页自由切换筛选。' },
  { q: '手机上能用吗？', a: '可以。页面已做 1024px 与 640px 两档响应式适配，手机、平板、桌面均可正常浏览与操作。' }
]

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="sec sec-gray">
      <div className="sec-inner narrow">
        <div className="sec-head">
          <div className="eyebrow">FAQ</div>
          <h2>常见问题</h2>
        </div>
        <div className="faq">
          {FAQ.map((f, i) => (
            <div className={'faq-i' + (open === i ? ' open' : '')} key={f.q}>
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{f.q}</span>
                <span className="faq-ico">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <div className="faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============ 底部 CTA ============ */
function Cta({ go }) {
  return (
    <section className="cta">
      <div className="cta-inner">
        <div className="cta-glow" />
        <div className="eyebrow purple">GET STARTED</div>
        <h2>现在，让客户主动出现</h2>
        <p>一句话交代任务，AI 立刻开始找人。无需注册，打开即用。</p>
        <div className="cta-btns">
          <button className="btn-hero-primary" onClick={() => go('task')}>开始 AI 获客 →</button>
          <button className="btn-hero-ghost" onClick={() => go('workbench')}>先看看工作台</button>
        </div>
        <div className="cta-note">纯演示项目 · 数据均为本地模拟 · 不涉及真实平台数据</div>
      </div>
    </section>
  )
}

/* ============ 页脚 ============ */
function Footer({ go }) {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-brand">
          <div className="foot-logo">
            <span className="foot-mark">◎</span>
            线索雷达
          </div>
          <p className="foot-desc">
            AI 自动获客演示平台。一句话交代任务，自动发现公开内容中的购买意向。
          </p>
          <div className="foot-badge">DEMO · 非商业产品</div>
        </div>
        <div className="foot-col">
          <div className="foot-h">产品</div>
          <button onClick={() => go('home')}>首页</button>
          <button onClick={() => go('task')}>AI 交代任务</button>
          <button onClick={() => go('collection')}>采集数据</button>
          <button onClick={() => go('customers')}>意向客户</button>
        </div>
        <div className="foot-col">
          <div className="foot-h">能力</div>
          <span>AI 语义理解</span>
          <span>双平台检索</span>
          <span>意向评分引擎</span>
          <span>实时采集流</span>
        </div>
        <div className="foot-col">
          <div className="foot-h">行业</div>
          {INDUSTRIES.slice(0, 5).map((i) => <span key={i.key}>{i.name}</span>)}
        </div>
      </div>
      <div className="foot-bottom">
        <span>© 2026 线索雷达 · AI 自动获客演示平台</span>
        <span className="foot-disclaimer">
          本项目为技术演示，全部数据为本地模拟，不采集、不存储任何真实平台数据
        </span>
      </div>
    </footer>
  )
}

/* ============ 主组件 ============ */
export default function Home() {
  const { go, customers } = useApp()
  const avg = customers.length
    ? Math.round(customers.reduce((s, c) => s + c.score, 0) / customers.length)
    : 0
  const sample = customers.find((c) => c.comment.includes('怎么收费'))

  return (
    <div className="home">
      {/* ===== 深色大首屏 ===== */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-inner">
          <div>
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
            <div className="hero-trust">
              <span>✓ 无需注册</span>
              <span>✓ 打开即用</span>
              <span>✓ 演示数据 · 不涉及真实平台</span>
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
                <div className="num"><Counter to={7} /><em>× 24h</em></div>
                <div className="lbl">持续监控任务</div>
              </div>
            </div>
          </div>
          <SignalPanel />
        </div>
      </section>

      <PlatformStrip />
      <Features />
      <Flow />
      <Showcase />
      <Steps sample={sample} />
      <Metrics />
      <Industry />
      <Compare />
      <Testimonials />
      <Faq />
      <Cta go={go} />
      <Footer go={go} />
    </div>
  )
}
