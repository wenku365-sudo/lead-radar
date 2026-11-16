import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../App.jsx'
import { api } from '../api/client.js'

const EXAMPLES = [
  '帮我找需要买家具的客户',
  '帮我找需要去云南大理旅游的客户',
  '帮我找想给孩子报国学班的家长',
  '帮我找想减肥的女生',
  '帮我找需要退费维权的客户',
  '帮我找需要律师的客户',
  '帮我找想加盟便利店的人',
  '帮我找情感挽回的客户'
]

/** 关键词 chip 编辑器：输入回车添加，点 × 删除 */
function ChipEditor({ label, hint, words, onChange, color }) {
  const [text, setText] = useState('')
  const add = () => {
    const v = text.trim()
    if (!v) return
    if (!words.includes(v)) onChange([...words, v])
    setText('')
  }
  return (
    <div className="ar-item" style={{ gridColumn: '1 / -1' }}>
      <b>{label}：</b>
      <span style={{ color: '#9aa0b5', fontSize: 12, marginRight: 4 }}>{hint}</span>
      <div className="ar-kws" style={{ marginTop: 6 }}>
        {words.map((k) => (
          <span
            className="ar-kw"
            key={k}
            style={{ cursor: 'pointer', background: color, color: '#fff' }}
            title="点击删除"
            onClick={() => onChange(words.filter((w) => w !== k))}
          >
            {k} ×
          </span>
        ))}
        <input
          className="kw-add-input"
          placeholder="+ 回车添加"
          value={text}
          style={{
            border: `1.5px dashed ${color}55`, borderRadius: 8, padding: '3px 10px',
            fontSize: 12, width: 110, outline: 'none', background: 'transparent'
          }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add() }
            if (e.key === 'Backspace' && !text && words.length) onChange(words.slice(0, -1))
          }}
          onBlur={add}
        />
      </div>
    </div>
  )
}

export default function TaskCreate() {
  const { openCollect, addTask, go, demoTask, parseTask, mode } = useApp()
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState([
    {
      role: 'ai',
      text: '你好，我是线索雷达的 AI 获客助理 👋\n请用一句话告诉我你的获客任务，例如：「帮我找需要买家具的客户」。\n我会自动拆解任务、规划搜索关键词、识别购买意向信号。'
    }
  ])
  const [thinking, setThinking] = useState(false)
  const [result, setResult] = useState(null)
  const [searchKws, setSearchKws] = useState([]) // 搜索关键词：搜对标视频用
  const [matchWds, setMatchWds] = useState([])   // 匹配词：评论命中才进系统
  const [dataSource, setDataSource] = useState(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, thinking, result])

  // 在线模式：拉取当前数据源状态
  useEffect(() => {
    if (mode !== 'api') return
    api('/api/data-source').then((r) => setDataSource(r.source)).catch(() => setDataSource(null))
  }, [mode])

  // 演讲模式：收到演示指令后自动填入任务并触发生成
  useEffect(() => {
    if (!demoTask) return
    setInput(demoTask.text)
    const t = setTimeout(() => generate(demoTask.text), 1100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoTask])

  // override 传入字符串时用于演讲模式自动演示；作为 onClick 直接绑定时会收到事件对象，需过滤
  const generate = async (override) => {
    const text = (typeof override === 'string' ? override : input).trim()
    if (!text) return
    setMsgs((m) => [...m, { role: 'user', text }])
    setThinking(true)
    setInput('')
    try {
      // 在线模式走后端解析（可接大模型），演示模式本地规则；保底 1.6 秒思考动画
      const [u] = await Promise.all([
        parseTask(text),
        new Promise((r) => setTimeout(r, 1600))
      ])
      setResult(u)
      setSearchKws(u.searchKeywords || [])
      setMatchWds(u.matchWords || u.focus || [])
      setMsgs((m) => [
        ...m,
        {
          role: 'ai',
          text: '收到！我已经理解了你的获客任务，拆解结果如下 👇\n可以直接修改「搜索关键词」和「匹配词」，我会按它们去搜对标视频、筛选意向评论。'
        }
      ])
    } catch (e) {
      setMsgs((m) => [
        ...m,
        { role: 'ai', text: `解析失败：${e.message}，请稍后重试，或切回演示模式体验。` }
      ])
    } finally {
      setThinking(false)
    }
  }

  const startCollect = async () => {
    if (!result) return
    const task = {
      title: result.input,
      industry: result.industryName,
      industryKey: result.industryKey,
      emoji: result.emoji,
      desc: `搜索「${searchKws.slice(0, 2).join('」「')}」对标视频 · 评论命中「${matchWds.slice(0, 3).join('」「')}」等词即入线索池`,
      videos: result.videos,
      customers: result.customers,
      lastRun: '刚刚',
      status: 'new',
      understanding: result,
      searchKeywords: searchKws,
      matchWords: matchWds
    }
    const created = await addTask(task)
    openCollect(created || task)
  }

  return (
    <div className="chat-wrap">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>AI 交代任务</h1>
        <p style={{ color: '#3a3f4f', marginTop: 6, fontSize: 14.5 }}>
          像给助理安排工作一样，一句话启动自动获客
        </p>
      </div>

      {/* 数据源状态徽标（在线模式） */}
      {mode === 'api' && dataSource && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            marginBottom: 14, fontSize: 12.5, color: '#5c6274'
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 99, background: dataSource.mode === 'http' ? '#22c55e' : '#e8a23a', display: 'inline-block' }} />
          数据源：{dataSource.adapter}
          {dataSource.mode === 'mock' && (
            <span style={{ color: '#9aa0b5' }}>（配置 LR_DOUYIN_API_BASE 可接入真实抖音数据通道）</span>
          )}
        </div>
      )}

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
                正在理解任务、规划搜索关键词
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
                <div className="ar-title">
                  ✅ 任务理解结果 · {result.emoji} {result.industryName}
                  {result.generated && (
                    <span className="ar-badge">AI 实时生成 · {result.archetypeLabel}</span>
                  )}
                </div>
                <div className="ar-grid">
                  <div className="ar-item">
                    <b>目标客户：</b>
                    {result.target}
                  </div>
                  <div className="ar-item">
                    <b>搜索范围：</b>
                    对标视频 + 评论
                  </div>
                  <ChipEditor
                    label="🔍 搜索关键词"
                    hint="用于搜索对标视频"
                    words={searchKws}
                    onChange={setSearchKws}
                    color="#7c3aed"
                  />
                  <ChipEditor
                    label="🎯 匹配词"
                    hint="评论命中任意词即推送为线索"
                    words={matchWds}
                    onChange={setMatchWds}
                    color="#d6455b"
                  />
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
        {mode === 'api' ? '按搜索关键词搜对标视频 · 评论命中匹配词自动推送为线索 · ' : '演示环境 · 所有数据为前端 mock 数据，不连接真实平台 · '}
        <span style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 700 }} onClick={() => go('collection')}>
          前往采集数据页 →
        </span>
      </p>
    </div>
  )
}
