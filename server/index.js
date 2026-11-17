/**
 * 线索雷达后端入口：REST API + WebSocket + 静态托管前端产物。
 *
 * 启动：node server/index.js   （或 npm run server）
 * 环境变量：PORT / JWT_SECRET / LLM_API_KEY / LLM_BASE_URL / LLM_MODEL / LR_COLLECT_INTERVAL_MS
 */
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireAuth } from './auth.js'
import { createHub } from './ws.js'
import { startWorker } from './collector/worker.js'
import { seedIfEmpty } from './seed.js'
import { loadGeneratedIndustries } from './industry-store.js'
import { llmEnabled } from './llm/provider.js'
import { dataSourceInfo } from './collector/adapters/index.js'
import authRoutes from './routes/auth.js'
import taskRoutes from './routes/tasks.js'
import leadRoutes from './routes/leads.js'
import statsRoutes from './routes/stats.js'
import dataRoutes from './routes/import.js'
import simRoutes from './dev/douyin-sim/sim.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT || 5190)

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// 请求日志（开发）
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.path}`)
  }
  next()
})

app.get('/api/health', (req, res) =>
  res.json({
    ok: true,
    ts: Date.now(),
    llm: llmEnabled ? 'enabled' : 'rules-fallback',
    dataSource: dataSourceInfo().mode
  })
)

app.use('/api/auth', authRoutes)
app.use('/api/tasks', requireAuth, taskRoutes)
app.use('/api/leads', requireAuth, leadRoutes)
app.use('/api/stats', requireAuth, statsRoutes)
app.use('/api', requireAuth, dataRoutes)
app.use('/', simRoutes) // 仿真抖音页面 /sim + /sim/data（浏览器自动化采集的演示目标页）

// 静态托管前端构建产物（npm run build 后生效），SPA 回退
const distDir = path.resolve(__dirname, '../dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api|\/ws).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))
} else {
  app.get('/', (req, res) =>
    res.send('线索雷达 API 运行中。前端未构建：请先执行 npm run build（或用 Vite dev 端口 5188 联调）。')
  )
}

// 统一错误处理
app.use((err, req, res, next) => {
  console.error('[api] error:', err.message)
  res.status(500).json({ error: '服务内部错误' })
})

const server = app.listen(PORT, () => {
  const ds = dataSourceInfo()
  console.log('==============================================')
  console.log(`  线索雷达 · 后端服务已启动`)
  console.log(`  地址      http://localhost:${PORT}`)
  if ((process.env.LR_SEED_DEMO ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')) === 'true') {
    console.log('  已启用演示账号种子数据（仅供演示）')
  } else {
    console.log('  账号      请在登录页注册账号')
  }
  console.log(`  意向打分  ${llmEnabled ? '大模型（' + (process.env.LLM_MODEL || 'gpt-4o-mini') + '）' : '规则引擎（配置 LLM_API_KEY 可启用大模型）'}`)
  console.log(`  数据源    ${ds.adapter}${ds.mode === 'mock' ? '（' + ds.hint + '）' : ''}`)
  console.log('==============================================')
})

const hub = createHub(server)
app.set('hub', hub)

loadGeneratedIndustries()
seedIfEmpty()
startWorker(hub)
