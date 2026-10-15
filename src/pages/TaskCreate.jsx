import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../App.jsx'
import { understandTask } from '../data/mock.js'

const EXAMPLES = [
  '帮我找需要买家具的客户',
  '帮我找想学少儿编程的家长',
  '帮我找近期想减脂的上班族',
  '帮我找准备装修的客户',
  '帮我找想买二手车的人'
]

export default function TaskCreate() {
  const { openCollect, addTask, go, demoTask } = useApp()
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState([
    {
      role: 'ai',
      text: '你好，我是线索雷达的 AI 获客助理 👋\n请用一句话告诉我你的获客任务，例如：「帮我找需要买家具的客户」。\n我会自动拆解任务、规划搜索范围、识别购买意向信号。'
    }
  ])
  const [thinking, setThinking] = useState(false)
  const [result, setResult] = useState(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, thinking, result])

  // 演讲模式：收到演示指令后自动填入任务并触发生成
  useEffect(() => {
    if (!demoTask) return
    setInput(demoTask.text)
    const t = setTimeout(() => generate(demoTask.text), 1100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoTask])

  // override 传入字符串时用于演讲模式自动演示；作为 onClick 直接绑定时会收到事件对象，需过滤
  const generate = (override) => {
    const text = (typeof override === 'string' ? override : input).trim()
    if (!text) return
    setMsgs((m) => [...m, { role: 'user', text }])
    setThinking(true)
    setInput('')
    setTimeout(() => {
      const u = understandTask(text)
      setThinking(false)
      setResult(u)
      setMsgs((m) => [
        ...m,
        {
          role: 'ai',
          text: '收到！我已经理解了你的获客任务，拆解结果如下 👇'
        }
      ])
    }, 1600)
  }

  const startCollect = () => {
    if (!result) return
    const task = {
      title: result.input,
      industry: result.industryName,
      emoji: result.emoji,
      desc: '抖音 + 小红书公开视频 · AI 自动识别购买信号',
      videos: result.videos,
      customers: result.customers,
      lastRun: '刚刚',
      status: 'new',
      understanding: result
    }
    addTask(task)
    openCollect(task)
  }

  return (
    <div className="chat-wrap">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>AI 交代任务</h1>
        <p style={{ color: '#3a3f4f', marginTop: 6, fontSize: 14.5 }}>
          像给助理安排工作一样，一句话启动自动获客
        </p>
      </div>

      <div className="quick-examples" style={{ justifyContent: 'center' }}>
        {EXAMPLES.map((e) => (
          <button key={e} className="qe-btn" onClick={() => setInput(e)}>
            ⚡ {e}
          </button>
        ))}
      </div>

      <div className="chat-box">
        <div className="chat-head">
          <div className="chat-avatar">🤖</div>
          <div>
            <div className="cn">AI 获客助理</div>
            <div className="cs">
              <span style={{ width: 7, height: 7, borderRadius: 99, background: '#22c55e', display: 'inline-block' }} />
              在线 · 已就绪
            </div>
          </div>
        </div>

        <div className="chat-body" ref={bodyRef}>
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'ai' ? 'msg msg-ai' : 'msg msg-user'}>
              <div className={'ma ' + (m.role === 'ai' ? 'ma-ai' : 'ma-user')}>
                {m.role === 'ai' ? '🤖' : '🙂'}
              </div>
              <div className="bubble" style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
            </div>
          ))}

          {thinking && (
            <div className="msg msg-ai">
              <div className="ma ma-ai">🤖</div>
              <div className="bubble">
                正在理解任务、规划搜索范围
                <div className="typing-dots" style={{ marginLeft: 6 }}>
                  <i /><i /><i />
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="msg msg-ai">
              <div className="ma ma-ai">🤖</div>
              <div className="ai-result">
                <div className="ar-title">✅ 任务理解结果 · {result.emoji} {result.industryName}</div>
                <div className="ar-grid">
                  <div className="ar-item">
                    <b>目标客户：</b>
                    {result.target}
                  </div>
                  <div className="ar-item">
                    <b>搜索范围：</b>
                    {result.industries.map((p) => p).join(' + ')} 公开视频
                  </div>
                  <div className="ar-item" style={{ gridColumn: '1 / -1' }}>
                    <b>重点识别：</b>
                    <div className="ar-kws">
                      {result.focus.map((k) => (
                        <span className="ar-kw" key={k}>{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ar-predict">
                  <div className="ar-pv">
                    <div className="n">{result.videos}</div>
                    <div className="l">预计发现视频</div>
                  </div>
                  <div className="ar-pv">
                    <div className="n">{result.customers}</div>
                    <div className="l">预计发现客户</div>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 14 }}
                  onClick={startCollect}
                >
                  🚀 开始采集这项任务
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-row">
          <input
            className="chat-input"
            placeholder="例如：帮我找需要买家具的客户"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
          />
          <button className="btn btn-primary" onClick={generate} disabled={!input.trim() || thinking}>
            生成任务
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: '#9aa0b5', fontSize: 12.5, marginTop: 18 }}>
        演示环境 · 所有数据为前端 mock 数据，不连接真实平台 ·{' '}
        <span style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 700 }} onClick={() => go('collection')}>
          前往采集数据页 →
        </span>
      </p>
    </div>
  )
}
