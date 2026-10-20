# 线索雷达 · AI 自动获客平台

一句话交代获客任务，AI 自动翻阅评论、识别购买意向、推送意向客户。

双模式设计：

- **演示模式**（默认）：纯前端 mock 数据，无需登录，打开即用 —— 适合产品演示与讲解
- **在线模式**：连接后端服务（SQLite 数据库 + 采集 Worker + WebSocket 实时推送），数据真实落库、跨设备共享

> 合规说明：本系统不抓取平台数据。在线模式的采集由「平台适配器」驱动，内置 Mock 适配器模拟授权账号的评论流入；真实接入需申请抖音开放平台 / 小红书专业号的企业资质后，在 `server/collector/adapters/` 按同一接口实现真实适配器。

## 在线预览

GitHub Pages（演示模式）：**<https://wenku365-sudo.github.io/lead-radar/>**

推送到 `main` 分支后由 GitHub Actions 自动构建发布（约 40 秒生效）。

## 页面

| 页面 | 说明 |
| --- | --- |
| 首页 | 深色发布会风格首屏 + 实时获客信号动画 + 流程可视化 |
| AI 交代任务 | 聊天式创建获客任务，AI 拆解目标客户 / 搜索范围 / 重点关键词 |
| 工作台 | 累计客户 / 今日新增 / 平均意向分 / 待跟进统计与行业概览 |
| 采集数据 | 采集任务列表，「立即采集」播放四阶段采集动画（在线模式下同时真实触发后端采集） |
| 意向客户 | 四维筛选 + 详情抽屉 + AI 推荐回复话术；实时流入动画（演示模式本地模拟 / 在线模式 WebSocket 真推送） |
| 跟进工作台 | 四状态流转（待跟进→已联系→已到店→已成交）、转化漏斗、优先跟进 |

## 本地运行

要求 Node.js ≥ 18：

```bash
npm install
npm run dev      # 前端开发服务器 http://127.0.0.1:5188（演示模式）
npm run server   # 后端服务 http://127.0.0.1:5190（API + WebSocket + 托管 dist）
npm run build    # 生产构建，产物在 dist/
npm start        # 同 server；建议先 build，一条命令起完整系统
```

完整体验（在线模式）：

```bash
npm run build && npm start
# 打开 http://127.0.0.1:5190 → 点右上角「连接后端」→ demo / demo123
```

首次启动自动创建演示账号并导入种子数据（7 个任务 + 372 条线索）。

## 架构

```
├── src/                     前端（React 18 + Vite 5）
│   ├── api/client.js        fetch 封装 + WebSocket 重连
│   ├── App.jsx              双模式状态层（演示 mock / 在线 API）
│   └── pages/               6 个页面（数据层对双模式透明）
└── server/                  后端（Express 5 + better-sqlite3 + ws）
    ├── index.js             入口：REST + WS + 静态托管
    ├── db.js                SQLite 建表（users/tasks/videos/leads/follow_logs）
    ├── auth.js              JWT 签发与校验
    ├── routes/              auth / tasks / leads / stats
    ├── collector/           采集 Worker + 平台适配器接口
    └── llm/provider.js      LLM 抽象（OpenAI 兼容）+ 规则引擎降级
```

### API 一览

```
POST   /api/auth/register|login     注册 / 登录（JWT）
GET    /api/auth/me                 当前用户与授权账号
GET    /api/tasks                   任务列表
POST   /api/tasks/parse             AI 解析任务（不落库）
POST   /api/tasks                   创建任务
POST   /api/tasks/:id/run           手动触发一轮采集
PATCH  /api/tasks/:id               暂停 / 恢复
GET    /api/leads?industry=&platform=&level=&q=&limit=&offset=
GET    /api/leads/:id               线索详情 + 跟进流水
PATCH  /api/leads/:id               跟进状态 / 稍后跟进 / 备注
POST   /api/leads/:id/replies       AI 推荐话术（LLM 或规则）
GET    /api/stats                   工作台统计与漏斗
WS     /ws                          实时推送 {type:'lead:new', lead}
```

### 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | 5190 | 后端端口 |
| `JWT_SECRET` | dev 默认 | 生产务必改 |
| `LR_COLLECT_INTERVAL_MS` | 12000 | 采集轮询间隔 |
| `LLM_API_KEY` | 空 | 填入后意向打分与话术走大模型 |
| `LLM_BASE_URL` | OpenAI 官方 | 任意 OpenAI 兼容网关 |
| `LLM_MODEL` | gpt-4o-mini | 模型名 |

未配置 `LLM_API_KEY` 时自动降级为关键词规则引擎，系统无外部依赖也能完整运行。

## 部署

推送到 `main` 分支后，`.github/workflows/deploy.yml` 自动构建并发布 GitHub Pages（演示模式）。

在线模式部署到任意 Node 服务器：`npm install && npm run build && npm start`，数据落在 `server/data/lead-radar.db`。建议前置 Nginx 反代并配置 `location /ws` 的 WebSocket 升级头。

## 数据说明

演示模式与种子数据共用 `src/data/mock.js`（7 行业 372 条：家具 40 / 少儿编程 40 / 私教减脂 40 / 装修 55 / 医美 68 / 二手房 82 / 二手车 47）。在线模式下 Worker 持续采集新线索，数据与统计实时增长。
