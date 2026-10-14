import React, { useMemo, useState } from 'react'
import { useApp } from '../App.jsx'
import { splitKeywords, levelName, INDUSTRIES } from '../data/mock.js'

function Highlight({ text }) {
  return (
    <>
      {splitKeywords(text).map((p, i) =>
        p.kw ? (
          <span key={i} className="kw">{p.t}</span>
        ) : (
          <span key={i}>{p.t}</span>
        )
      )}
    </>
  )
}

export default function Workbench() {
  const { customers, tasks, go, openCollect } = useApp()
  const [followFilter, setFollowFilter] = useState('recent')

  const stats = useMemo(() => {
    const total = customers.length
    const today = customers.filter((c) => c.today).length
    const avg = total ? Math.round(customers.reduce((s, c) => s + c.score, 0) / total) : 0
    const pending = customers.filter((c) => !c.followed).length
    return { total, today, avg, pending }
  }, [customers])

  const indStats = useMemo(() => {
    const max = Math.max(...INDUSTRIES.map((i) => i.count))
    return INDUSTRIES.map((i) => ({
      ...i,
      n: customers.filter((c) => c.industryKey === i.key).length,
      max
    }))
  }, [customers])

  const recent = useMemo(() => {
    const list = customers.filter((c) => !c.followed)
    return followFilter === 'recent'
      ? customers.slice(0, 6)
      : list.slice(0, 6)
  }, [customers, followFilter])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">工作台</div>
          <div className="page-sub">线索雷达 · 今日 {new Date().getMonth() + 1} 月 {new Date().getDate()} 日 · 7 个任务持续监控中</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => go('customers')}>查看全部客户</button>
          <button className="btn btn-primary" onClick={() => go('task')}>+ 新建获客任务</button>
        </div>
      </div>

      {/* 统计卡 */}
      <div className="stat-grid">
        <div className="card stat-card">
          <div className="si" style={{ background: 'var(--purple-bg)' }}>🎯</div>
          <div className="trend tag tag-purple">+{stats.today} 今日</div>
          <div className="sv">{stats.total.toLocaleString()}</div>
          <div className="sl">累计意向客户</div>
        </div>
        <div className="card stat-card">
          <div className="si" style={{ background: 'var(--green-bg)' }}>📈</div>
          <div className="trend tag tag-green">实时更新</div>
          <div className="sv">{stats.today}</div>
          <div className="sl">今日新增客户</div>
        </div>
        <div className="card stat-card">
          <div className="si" style={{ background: 'var(--orange-bg)' }}>⭐</div>
          <div className="trend tag tag-orange">高意向 {customers.filter((c) => c.level === 'high').length} 位</div>
          <div className="sv">{stats.avg}<em>分</em></div>
          <div className="sl">平均意向评分</div>
        </div>
        <div className="card stat-card">
          <div className="si" style={{ background: 'var(--red-bg)' }}>📞</div>
          <div className="trend tag tag-red">待处理</div>
          <div className="sv">{stats.pending}</div>
          <div className="sl">待跟进客户</div>
        </div>
      </div>

      <div className="wb-grid">
        {/* 左列 */}
        <div className="wb-col">
          <div className="card panel-card">
            <div className="panel-title">
              我的采集任务
              <span className="more" onClick={() => go('collection')}>全部任务 →</span>
            </div>
            {tasks.slice(0, 5).map((t) => (
              <div className="task-row" key={t.id}>
                <div className="task-ico">{t.emoji}</div>
                <div className="grow">
                  <div className="tt">{t.title}</div>
                  <div className="tm">
                    {t.videos} 条视频 · {t.customers} 位客户 · 上次运行 {t.lastRun}
                  </div>
                </div>
                {t.status === 'running' ? (
                  <span className="tag tag-green">● 监控中</span>
                ) : (
                  <span className="tag tag-gray">已完成</span>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => openCollect(t)}>
                  立即采集
                </button>
              </div>
            ))}
          </div>

          <div className="card panel-card">
            <div className="panel-title">
              行业数据概览
              <span className="more" onClick={() => go('customers')}>意向客户 →</span>
            </div>
            {indStats.map((i) => (
              <div className="ind-bar-row" key={i.key}>
                <div className="in">{i.emoji} {i.name}</div>
                <div className="ind-bar-track">
                  <div className="ind-bar-fill" style={{ width: `${(i.n / i.max) * 100}%` }} />
                </div>
                <div className="iv">{i.n} 条</div>
              </div>
            ))}
          </div>
        </div>

        {/* 右列 */}
        <div className="wb-col">
          <div className="card panel-card">
            <div className="panel-title">
              最近发现的意向客户
              <span style={{ display: 'flex', gap: 6 }}>
                <button
                  className={'btn btn-sm ' + (followFilter === 'recent' ? 'btn-primary' : 'btn-ghost')}
                  onClick={() => setFollowFilter('recent')}
                >
                  最新
                </button>
                <button
                  className={'btn btn-sm ' + (followFilter === 'pending' ? 'btn-primary' : 'btn-ghost')}
                  onClick={() => setFollowFilter('pending')}
                >
                  待跟进
                </button>
              </span>
            </div>
            {recent.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="et">🎉 太棒了，没有待跟进的客户</div>
              </div>
            ) : (
              recent.map((c) => (
                <div className="task-row" key={c.id} style={{ cursor: 'pointer' }} onClick={() => go('customers')}>
                  <div className="cust-avatar" style={{ background: c.avatarColor }}>
                    {c.nick[0]}
                  </div>
                  <div className="grow">
                    <div className="tt" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                        {c.nick}
                      </span>
                      <span className={'score-pill ' + (c.level === 'high' ? 'score-high' : c.level === 'mid' ? 'score-mid' : 'score-low')} style={{ fontSize: 11, minWidth: 40, padding: '1px 7px' }}>
                        {c.score}
                      </span>
                    </div>
                    <div className="tm" style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      <Highlight text={c.comment} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div style={{ fontSize: 11.5, color: '#9aa0b5' }}>{c.time}</div>
                    <span className={'tag ' + (c.level === 'high' ? 'tag-red' : c.level === 'mid' ? 'tag-orange' : 'tag-gray')} style={{ marginTop: 3 }}>
                      {levelName[c.level]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card panel-card" style={{ background: 'linear-gradient(135deg, #f3eeff, #fff)' }}>
            <div className="panel-title">💡 演示提示</div>
            <div style={{ fontSize: 13.5, color: '#3a3f4f', lineHeight: 1.8 }}>
              <p>· 前往 <b>AI 交代任务</b> 页，一句话创建获客任务</p>
              <p>· 前往 <b>采集数据</b> 页，点击「立即采集」查看四阶段采集动画</p>
              <p>· 前往 <b>意向客户</b> 页，按行业 / 平台 / 意向筛选客户</p>
              <p>· 点击任意客户，打开右侧详情抽屉进行跟进</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
