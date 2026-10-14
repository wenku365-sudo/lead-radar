import React, { useMemo, useState } from 'react'
import { useApp } from '../App.jsx'

export default function Collection() {
  const { tasks, openCollect, go } = useApp()
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((t) => (filter === 'new' ? t.status === 'new' : t.status !== 'new'))),
    [tasks, filter]
  )

  const totalVideos = tasks.reduce((s, t) => s + t.videos, 0)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-title">采集数据</div>
          <div className="page-sub">
            共 {tasks.length} 个采集任务 · 累计匹配 {totalVideos.toLocaleString()} 条视频 · 持续监控抖音 / 小红书公开内容
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => go('task')}>+ 新建 AI 任务</button>
      </div>

      <div className="ind-tabs" style={{ marginBottom: 18 }}>
        {[
          { k: 'all', l: '全部任务' },
          { k: 'running', l: '监控中' },
          { k: 'new', l: '我创建的' }
        ].map((f) => (
          <button
            key={f.k}
            className={'ind-tab' + (filter === f.k ? ' active' : '')}
            onClick={() => setFilter(f.k)}
          >
            {f.l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="eico">📭</div>
          <div className="et">暂无任务</div>
          <div className="ed">点击右上角「新建 AI 任务」创建你的第一个获客任务</div>
        </div>
      ) : (
        <div className="task-grid">
          {filtered.map((t) => (
            <div className="card collect-card" key={t.id}>
              <div className="cc-head">
                <div className="cc-ico">{t.emoji}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="cc-title">{t.title}</div>
                  <div className="cc-sub">
                    {t.status === 'running' ? '● 持续监控中' : '上次运行 ' + t.lastRun}
                  </div>
                </div>
              </div>
              <div className="cc-desc">{t.desc}</div>
              <div className="cc-stats">
                <div className="cc-stat">
                  <div className="n" style={{ color: 'var(--purple-dark)' }}>{t.videos}</div>
                  <div className="l">发现视频</div>
                </div>
                <div className="cc-stat">
                  <div className="n" style={{ color: 'var(--red)' }}>{t.customers}</div>
                  <div className="l">意向客户</div>
                </div>
                <div className="cc-stat">
                  <div className="n" style={{ color: 'var(--green)' }}>
                    {Math.round((t.customers / t.videos) * 100) + '%'}
                  </div>
                  <div className="l">转化率</div>
                </div>
              </div>
              <div className="cc-foot">
                <span className="cc-time">{t.industry}</span>
                <button className="btn btn-primary btn-sm" onClick={() => openCollect(t)}>
                  ▶ 立即采集
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
