import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../App.jsx'
import { DEFAULT_TASKS } from '../data/mock.js'

const STEPS = [
  {
    key: 'home',
    title: '产品概览',
    dur: 7000,
    note: '一句话交代获客任务，AI 自动发现公开内容中的购买意向。'
  },
  {
    key: 'task',
    title: 'AI 交代任务',
    dur: 11000,
    note: '输入一句话，AI 自动拆解目标客户、搜索范围与重点识别关键词。'
  },
  {
    key: 'collect',
    title: '采集全过程',
    dur: 26000,
    note: '模拟真人浏览：搜索视频 → 打开详情 → 逐条翻阅评论 → 筛出意向客户。'
  },
  {
    key: 'customers',
    title: '意向客户流入',
    dur: 14000,
    note: '新客户持续流入列表，意向评分与购买信号关键词实时高亮。'
  },
  {
    key: 'followup',
    title: '跟进与转化',
    dur: 10000,
    note: 'AI 生成回复话术，跟进状态从待跟进一路流转到已成交。'
  }
]

export default function PresentMode({ onExit }) {
  const { go, openCollect, closeCollect, setDemoTask } = useApp()
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [ms, setMs] = useState(0)
  const enterTimer = useRef(null)

  const step = STEPS[idx]

  // 进入某一环节：切页 + 触发该环节的演示动作
  useEffect(() => {
    closeCollect()
    if (step.key === 'task') {
      go('task')
      setDemoTask({ text: '帮我找需要买家具的客户', nonce: Date.now() })
    } else if (step.key === 'collect') {
      go('collection')
      setDemoTask(null)
      enterTimer.current = setTimeout(() => openCollect(DEFAULT_TASKS[0]), 900)
    } else {
      setDemoTask(null)
      go(step.key)
    }
    return () => clearTimeout(enterTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  // 计时推进，时间到自动进入下一环节（最后一步循环回第一步）
  useEffect(() => {
    if (!playing) return
    setMs(0)
    const t0 = Date.now()
    const timer = setInterval(() => {
      const e = Date.now() - t0
      setMs(e)
      if (e >= step.dur) {
        clearInterval(timer)
        setIdx((i) => (i + 1) % STEPS.length)
      }
    }, 100)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, playing])

  const jump = (i) => {
    setIdx((i + STEPS.length) % STEPS.length)
  }

  const pct = Math.min(100, (ms / step.dur) * 100)
  const left = Math.max(0, Math.ceil((step.dur - ms) / 1000))

  return (
    <div className="present">
      <div className="present-bar">
        <div className="pb-head">
          <div className="pb-title">
            <span className="pb-live" />
            演讲模式 · 自动串场
          </div>
          <div className="pb-note">{step.note}</div>
        </div>

        <div className="pb-steps">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              className={'pb-step' + (i === idx ? ' on' : '') + (i < idx ? ' done' : '')}
              onClick={() => jump(i)}
            >
              <span className="pb-i">{i < idx ? '✓' : i + 1}</span>
              {s.title}
            </button>
          ))}
        </div>

        <div className="pb-prog">
          <i style={{ width: pct + '%' }} />
        </div>

        <div className="pb-ctrl">
          <button className="pb-btn" onClick={() => jump(idx - 1)}>⏮ 上一步</button>
          <button className="pb-btn primary" onClick={() => setPlaying((v) => !v)}>
            {playing ? '⏸ 暂停' : '▶ 继续'}
          </button>
          <button className="pb-btn" onClick={() => jump(idx + 1)}>下一步 ⏭</button>
          <span className="pb-left">{playing ? `${left} 秒后自动进入下一环节` : '已暂停'}</span>
          <button className="pb-exit" onClick={onExit}>✕ 退出</button>
        </div>
      </div>
    </div>
  )
}
