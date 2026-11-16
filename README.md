# 线索雷达 · AI 自动获客平台

一句话交代获客任务，AI 自动翻阅评论、识别购买意向、推送意向客户。

双模式设计：

- **演示模式**（默认）：纯前端 mock 数据，无需登录，打开即用 —— 适合产品演示与讲解
- **在线模式**：连接后端服务（SQLite 数据库 + 采集 Worker + WebSocket 实时推送），数据真实落库、跨设备共享

> 合规说明：本系统不绕过平台反爬机制抓取数据。采集管线为「搜索关键词 → 对标视频 → 评论 → 匹配词过滤 → 意向推送」，数据获取层是可插拔适配器：内置 Mock 适配器（演示），以及 `douyin-http` 适配器（指向你拥有权限的合规数据通道，见下文「真实线索获取」）。

## 在线预览

GitHub Pages（演示模式）：**<https://wenku365-sudo.github.io/lead-radar/>**

推送到 `main` 分支后由 GitHub Actions 自动构建发布（约 40 秒生效）。

当前版本支持自定义行业任务；采集弹窗约 10 秒完成，内容跟随任务行业；意向客户首次展示 15 条，其余逐条插入；行业栏默认收起，自定义行业优先显示。GitHub Pages 托管前端演示模式，在线采集与数据库需要单独运行后端服务。

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

要求 Node.js ≥ 22：

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

首次启动自动创建演示账号并导入种子数据（8 个任务 + 851 条线索）。

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
POST   /api/tasks                   创建任务（可携带 searchKeywords / matchWords）
POST   /api/tasks/:id/run           手动触发一轮采集
PATCH  /api/tasks/:id               暂停 / 恢复
GET    /api/leads?industry=&platform=&level=&q=&limit=&offset=
GET    /api/leads/:id               线索详情 + 跟进流水
PATCH  /api/leads/:id               跟进状态 / 稍后跟进 / 备注
POST   /api/leads/:id/replies       AI 推荐话术（LLM 或规则）
POST   /api/leads/import            批量导入真实评论（走完整采集管线）
GET    /api/data-source             当前数据源状态（mock / 真实 HTTP 通道）
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
| `LR_DOUYIN_API_BASE` | 空 | 抖音数据通道基地址，填入后自动切换真实采集 |
| `LR_DOUYIN_API_KEY` | 空 | 上游 Bearer Token |
| `LR_DOUYIN_SEARCH_PATH` | /search/videos | 搜索视频接口路径 |
| `LR_DOUYIN_COMMENTS_PATH` | /comments | 拉取评论接口路径 |
| `LR_COLLECTOR` | auto | 采集方式：`auto` / `mock` / `http` / `browser` |
| `LR_BROWSER_SOURCE_URL` | http://127.0.0.1:5190/sim | 浏览器自动化的目标页面 |
| `LR_BROWSER_HEADLESS` | true | 设为 `false` 可看到浏览器自动操作（演示推荐） |

未配置 `LLM_API_KEY` 时自动降级为关键词规则引擎；未配置 `LR_DOUYIN_API_BASE` 时采集走 Mock 适配器，系统无外部依赖也能完整运行。

## 真实线索获取

系统的采集管线为：**搜索关键词 → 搜对标视频 → 拉取评论 → 匹配词过滤 → 意向打分 → 去重落库 → WebSocket 推送**。数据获取层是可插拔的适配器（`server/collector/adapters/`）：

### 方式一：接入真实数据通道（douyin-http 适配器）

抖音官方开放平台不提供「搜索任意对标视频 + 拉取竞品评论」的 API，因此适配器指向**你拥有使用权限**的上游服务，例如：

1. 抖音开放平台（自有授权账号，自行封装成约定格式）
2. 合规第三方数据服务商 API（蝉妈妈 / 新抖 / 飞瓜等付费接口）
3. 自建采集网关（部署在自有服务器，输出下述约定格式）

上游只需实现两个 GET 接口（字段名做了弹性映射，`id/video_id/aweme_id`、`text/content/comment` 等常见命名均可识别）：

```
GET {base}/search/videos?keyword=全屋定制&count=10
→ { "videos": [ { "id": "v1", "title": "...", "author": "...", "likes": 12800, "comments": 420 } ] }

GET {base}/comments?video_id=v1&count=50
→ { "comments": [ { "cid": "c1", "text": "怎么收费？", "likes": 3, "user": { "nickname": "小明" } } ] }
```

启动：`LR_DOUYIN_API_BASE=https://你的网关 node server/index.js`。评论 ID（cid）保持稳定即可自动去重，重复拉取不会产生重复线索。

本地联调：`node server/dev/upstream-mock.js` 起一个模拟上游（5199），再 `LR_DOUYIN_API_BASE=http://127.0.0.1:5199 npm run server` 即可验证真实 HTTP 链路。

### 方式二：浏览器自动化采集（演示用 · 本地仿真页面）

`LR_COLLECTOR=browser` 启用。Playwright 驱动**真实浏览器**完成全流程：打开页面 → 输入搜索关键词 → 浏览搜索结果 → 逐个点开视频 → 滚动评论区 → 提取评论数据，再走统一的匹配词过滤 → 打分 → 去重 → 推送管线。

- 目标页面是系统自带的仿真抖音页面（`/sim`，数据由行业语料确定性生成，评论 ID 稳定可去重，并每 5 分钟"新进"一批评论）
- 演示时建议 `LR_BROWSER_HEADLESS=false`，浏览器全程可见地自动操作，讲解效果直观
- 依赖：`npm i playwright`（复用系统 Chrome/Edge，无需下载浏览器内核）
- 启动示例：`LR_COLLECTOR=browser LR_BROWSER_HEADLESS=false npm start`

```bash
# 演示建议组合：大模型打分 + 浏览器可见采集
LR_COLLECTOR=browser LR_BROWSER_HEADLESS=false LLM_API_KEY=sk-xxx npm start
```

> ⚠️ 本适配器仅面向本地仿真页面演示。不要将 `LR_BROWSER_SOURCE_URL` 指向抖音等真实平台——自动化抓取违反平台服务条款，且采集评论人个人信息涉及《个人信息保护法》合规要求。

### 方式三：批量导入真实评论

把从合规渠道拿到的评论（授权账号后台导出、人工整理等）POST 到 `/api/leads/import`，走与自动采集完全一致的管线（匹配词过滤 → 打分 → 去重 → 推送）：

```bash
curl -X POST http://127.0.0.1:5190/api/leads/import \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "video": { "title": "对标视频标题", "author": "作者" },
    "lines": ["小明 | 这套怎么收费？", "路人 | 哈哈哈"],
    "matchWords": ["怎么收费", "多少钱"]
  }'
```

支持 `comments`（结构化数组）与 `lines`（粘贴文本，`昵称 | 评论` 或纯评论）两种格式，未指定 `taskId` 时默认导入到最近一个运行中的任务。

### 合规提醒

直接爬取抖音 / 小红书数据违反平台服务条款，批量采集评论人个人信息并用于商业触达还涉及《个人信息保护法》《数据安全法》的合规要求。请通过官方 API、合规数据服务商或获得用户授权的渠道获取数据。

## 部署

推送到 `main` 分支后，`.github/workflows/deploy.yml` 自动构建并发布 GitHub Pages（演示模式）。

在线模式部署到任意 Node 服务器：`npm install && npm run build && npm start`，数据落在 `server/data/lead-radar.db`。建议前置 Nginx 反代并配置 `location /ws` 的 WebSocket 升级头。

## 数据说明

演示模式与种子数据共用 `src/data/mock.js`（21 行业 851 条，覆盖家具、装修、医美、旅游、教培、家政、维权、律师、减肥、国学、SPA、足浴、大健康、创业、体彩、便利店招商、情感咨询等）。在线模式下 Worker 持续采集新线索，数据与统计实时增长。

### 行业是动态生成的

行业不靠白名单。输入任意行业（例如「宠物殡葬」「无人机培训」「月子中心」「租写字楼」），系统会：

1. 从原话里提取行业主题（去掉指令词、目标人群、情态词）
2. 判断业务形态：到店服务 / 课程培训 / 招商加盟 / 专业服务 / 产品销售 / 通用服务
3. 实时合成该行业专属的：3 条对标视频、25 条评论语料、搜索词、匹配词、客户标签、AI 话术参数

动态行业写入 `industries` 表，重启后自动恢复，历史任务与线索的行业名称不会丢。实现见 `src/data/industry-synth.js`，生成过程是确定性的（同一行业永远得到同一份数据），保证评论 ID 稳定、可去重。
