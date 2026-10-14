import React, { useEffect, useMemo, useState } from 'react'
import { INDUSTRIES, splitKeywords } from '../data/mock.js'

// 时间轴（毫秒）
const T_STAGE2 = 6800
const T_STAGE3 = 12400
const T_STAGE4 = 22600
const CMT_INTERVAL = 1550
const CMT_COUNT = 6

const NICKS = ['小满不吃香菜', '爱吃菠萝的琳', '山城小土豆', '北纬三十度', '桃桃乌龙', '奔跑的蜗牛']
const AV_COLORS = ['#7c3aed', '#e0293b', '#ea7317', '#12915f', '#0ea5e9', '#d946ef']

function KwText({ text }) {
  return (
    <>
      {splitKeywords(text).map((p, i) =>
        p.kw ? <span key={i} className="kw">{p.t}</span> : <span key={i}>{p.t}</span>
      )}
    </>
  )
}

export default function CollectModal({ task, onClose }) {
  const ind = useMemo(
    () => INDUSTRIES.find((i) => i.name === task.industry) || INDUSTRIES[0],
    [task]
  )
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t0 = performance.now()
    const timer = setInterval(() => {
      setElapsed(performance.now() - t0)
    }, 90)
    return () => clearInterval(timer)
  }, [])

  const stage = elapsed < T_STAGE2 ? 1 : elapsed < T_STAGE3 ? 2 : elapsed < T_STAGE4 ? 3 : 4
  const progress = Math.min(100, (elapsed / T_STAGE4) * 100)

  // 阶段一：视频卡片出现节奏
  const cards = ind.videos.slice(0, 3).map((v, i) => ({
    ...v,
    visible: elapsed > 500 + i * 1150,
    locked: elapsed > 5300 && i === 0
  }))

  // 阶段二：播放进度
  const vp = Math.min(100, Math.max(0, ((elapsed - T_STAGE2) / (T_STAGE3 - T_STAGE2 - 400)) * 100))
  const video = ind.videos[0]

  // 阶段三：评论逐条
  const comments = useMemo(
    () =>
      ind.comments.slice(0, CMT_COUNT).map((c, i) => ({
        id: i,
        text: c,
        nick: NICKS[i],
        color: AV_COLORS[i],
        likes: 3 + i * 7,
        score: [92, 85, 78, 88, 74, 90][i],
        high: [92, 85, 78, 88, 74, 90][i] >= 80
      })),
    [ind]
  )
  const cmtState = (i) => {
    const start = T_STAGE3 + 200 + i * CMT_INTERVAL
    if (elapsed < start) return 'hidden'
    if (elapsed < start + 450) return 'pending'
    if (elapsed < start + 1050) return 'doing'
    return 'done'
  }
  const doneCount = comments.filter((_, i) => cmtState(i) === 'done').length
  const customerCount = comments.filter((c, i) => cmtState(i) === 'done' && c.high).length

  // 头部统计
  const videoStat = Math.min(128, Math.round(Math.min(1, elapsed / T_STAGE2) * 128))
  const cmtStat = stage < 2 ? 0 : Math.min(428, Math.round(Math.min(1, (elapsed - T_STAGE2) / (T_STAGE4 - T_STAGE2)) * 428))

  const stageNames = ['搜索相关视频', '打开视频详情', '逐条采集评论', '采集完成']
  const stageLabel =
    stage === 1 ? '正在搜索相关视频…' : stage === 2 ? '正在打开视频详情…' : stage === 3 ? '正在逐条采集评论…' : '采集完成 ✅'

  return (
    <div className="modal-mask" onClick={(e) => e.target === e.currentTarget && stage === 4 && onClose()}>
      <div className="collect-modal" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="cm-head">
          <div className="ct">
            {task.emoji} {task.title}
            <span style={{ color: '#8b92ad', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
              {task.industry}
            </span>
          </div>
          <div className="cm-stats">
            <div className="cm-stat">
              <div className="n">{stage === 4 ? 128 : videoStat}</div>
              <div className="l">{stage === 4 ? '已找到视频' : '浏览视频'}</div>
            </div>
            <div className="cm-stat">
              <div className="n">{stage === 4 ? 428 : cmtStat}</div>
              <div className="l">{stage === 4 ? '已翻阅评论' : '读取评论'}</div>
            </div>
            <div className="cm-stat hot">
              <div className="n">{customerCount}</div>
              <div className="l">{stage === 4 ? '已采集客户' : '采集客户'}</div>
            </div>
          </div>
          <button className="cm-close" title="手动关闭" onClick={onClose}>✕</button>
        </div>

        {/* 总进度 */}
        <div className="cm-progress-wrap">
          <div className="cm-progress-labels">
            <span className="cur">{stageLabel}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{Math.floor(progress)}%</span>
          </div>
          <div className="cm-progress-track">
            <div className="cm-progress-fill" style={{ width: progress + '%' }} />
          </div>
        </div>

        {/* 阶段标签 */}
        <div className="cm-stage-tabs">
          {stageNames.map((s, i) => {
            const n = i + 1
            const cls = n === stage ? ' on' : n < stage ? ' done' : ''
            return (
              <div key={s} className={'cm-stage-tab' + cls}>
                <span className="tno">{n < stage ? '✓' : `阶段${['一', '二', '三', '四'][i]}`}</span>
                {s}
              </div>
            )
          })}
        </div>

        {/* 主体 */}
        <div className="cm-body">
          {/* ======== 阶段一：搜索视频 ======== */}
          {stage === 1 && (
            <div className="browser">
              <div className="browser-bar">
                <div className="browser-dots"><i /><i /><i /></div>
                <div className="browser-url">
                  <span className="lock">🔒</span>
                  douyin.com/search/{encodeURI(ind.searchWord)}
                </div>
              </div>
              <div className="browser-body">
                <div className="match-hint">
                  <div className="spinner" />
                  正在匹配视频内容 · 关键词「{ind.searchWord}」
                </div>
                <div className="video-grid">
                  {cards.map((c, i) =>
                    c.visible ? (
                      <div key={i} className={'vcard' + (c.locked ? ' locked' : '')}>
                        {c.locked && (
                          <div className="locked-tag">✓ 已锁定</div>
                        )}
                        <div className="cover shimmer" style={{
                          background: ['linear-gradient(135deg,#3b2a6b,#241a45)', 'linear-gradient(135deg,#2c3a6e,#1a2245)', 'linear-gradient(135deg,#5b2a4a,#2c1a38)'][i],
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36
                        }}>
                          {['🛋️', '📦', '🪵'][i] || '🎬'}
                          <span className="dur">0{1 + i}:{30 + i * 7}</span>
                        </div>
                        <div className="vmeta">
                          <div className="vtitle">{c.title}</div>
                          <div className="vnums">
                            <span>❤️ {(c.likes / 10000).toFixed(1)}万</span>
                            <span>💬 {(c.cmts / 1000).toFixed(1)}k</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="vcard">
                        <div className="cover shimmer" style={{ height: 108 }} />
                        <div className="vmeta">
                          <div className="vtitle shimmer" style={{ height: 14, borderRadius: 4 }} />
                          <div className="vnums">
                            <span className="shimmer" style={{ display: 'inline-block', width: 40, height: 10, borderRadius: 4 }} />
                            <span className="shimmer" style={{ display: 'inline-block', width: 40, height: 10, borderRadius: 4 }} />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======== 阶段二/三/四：视频详情 ======== */}
          {stage >= 2 && (
            <>
              {stage === 4 && (
                <div className="done-banner">
                  <div className="db-ico">✓</div>
                  <div style={{ flex: 1 }}>
                    <div className="dbt">采集完成</div>
                    <div className="dbd">
                      本轮共找到 128 条视频，翻阅 428 条评论，采集到 {customerCount} 位意向客户，已全部加入线索池
                    </div>
                  </div>
                  <span className="tag tag-red" style={{ fontSize: 13, padding: '5px 12px' }}>
                    高意向 {comments.filter(c => c.high).length} 位
                  </span>
                </div>
              )}
              <div className="detail-grid">
                {/* 左：视频详情 */}
                <div className="detail-left">
                  <div
                    className="dl-cover"
                    style={{ background: 'linear-gradient(135deg,#3b2a6b,#1f1740)' }}
                  >
                    🛋️
                    {stage === 2 && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.35)', fontSize: 44, color: '#fff'
                      }}>
                        ▶
                      </div>
                    )}
                  </div>
                  <div className="dl-title">{video.title}</div>
                  <div className="dl-author">
                    <div className="dl-avatar">{video.author[0]}</div>
                    <div>
                      <div className="an">@{video.author}</div>
                      <div className="am">粉丝 36.8万 · 抖音</div>
                    </div>
                  </div>
                  <div className="dl-nums">
                    <span>❤️ <b>{(video.likes / 10000).toFixed(1)}万</b></span>
                    <span>⭐ <b>{(video.fav / 10000).toFixed(1)}万</b></span>
                    <span>💬 <b>{video.cmts.toLocaleString()}</b></span>
                  </div>
                  <div className="video-progress">
                    <div className="vp-track">
                      <div className="vp-fill" style={{ width: (stage === 2 ? vp : 100) + '%' }} />
                    </div>
                    <div className="vp-times">
                      <span>{stage === 2 ? `00:${String(Math.floor(vp * 0.62)).padStart(2, '0')}` : '00:38'}</span>
                      <span>01:02</span>
                    </div>
                  </div>
                  {stage === 2 && (
                    <div className="match-hint" style={{ marginTop: 14 }}>
                      <div className="spinner" />
                      正在打开视频详情 · 解析互动数据
                    </div>
                  )}
                </div>

                {/* 右：评论区 */}
                <div className="comment-panel">
                  <div className="comment-panel-head">
                    <span>💬 评论区（{video.cmts.toLocaleString()}）</span>
                    {stage === 2 ? (
                      <span style={{ color: '#a78bfa', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                        评论区加载中
                      </span>
                    ) : (
                      <span style={{ color: '#22c55e', fontSize: 12.5 }}>
                        已采集 {doneCount}/{CMT_COUNT} 条
                      </span>
                    )}
                  </div>

                  {stage === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} style={{ display: 'flex', gap: 10 }}>
                          <div className="shimmer" style={{ width: 30, height: 30, borderRadius: 99 }} />
                          <div style={{ flex: 1 }}>
                            <div className="shimmer" style={{ height: 11, width: '40%', borderRadius: 4 }} />
                            <div className="shimmer" style={{ height: 12, width: '90%', borderRadius: 4, marginTop: 7 }} />
                            <div className="shimmer" style={{ height: 12, width: '65%', borderRadius: 4, marginTop: 5 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(stage === 3 || stage === 4) && (
                    <div className="comment-list">
                      {comments.map((c, i) => {
                        const st = cmtState(i)
                        if (st === 'hidden') return null
                        return (
                          <div key={c.id} className={'cmt' + (st === 'done' ? ' collected' : '')}>
                            <div className="cmt-avatar" style={{ background: c.color }}>
                              {c.nick[0]}
                            </div>
                            <div className="cmain">
                              <div className="cnick">
                                {c.nick}
                                {st === 'done' && c.high && (
                                  <span className="cscore cscore-high">意向 {c.score}</span>
                                )}
                                {st === 'done' && !c.high && (
                                  <span className="cscore cscore-mid">意向 {c.score}</span>
                                )}
                              </div>
                              <div className="ctext">
                                <KwText text={c.text} />
                              </div>
                              <div className="cfoot">
                                <span>❤️ {c.likes}</span>
                                <span>刚刚</span>
                                <span className={'cstatus ' + (st === 'pending' ? 'cst-pending' : st === 'doing' ? 'cst-doing' : 'cst-done')}>
                                  {st === 'pending' && <>○ 待处理</>}
                                  {st === 'doing' && (
                                    <>
                                      <div className="spinner" style={{ width: 11, height: 11, borderWidth: 1.5 }} />
                                      采集中
                                    </>
                                  )}
                                  {st === 'done' && <>✓ 已采集</>}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {stage === 3 && doneCount < CMT_COUNT && (
                        <div style={{ color: '#767d99', fontSize: 12.5, textAlign: 'center', padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                          <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                          继续翻阅评论区…
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部操作 */}
        {stage === 4 ? (
          <div className="cm-done-actions">
            <button className="btn btn-green btn-lg" onClick={onClose} style={{ minWidth: 220 }}>
              ✓ 关闭窗口
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 24px 20px', textAlign: 'center', color: '#767d99', fontSize: 12.5 }}>
            采集进行中，请勿关闭窗口 · 采集完成后可手动关闭（预计还需 {Math.max(1, Math.ceil((T_STAGE4 - elapsed) / 1000))} 秒）
          </div>
        )}
      </div>
    </div>
  )
}
