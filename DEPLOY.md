# 公网部署：让手机和其他电脑也能登录

本项目已提供 `render.yaml`，适合先用 Render 部署一个实例。它同时托管前端、登录 API、SQLite 数据库和 WebSocket。部署成功后直接分享 Render 分配的 HTTPS 地址即可，不需要让每个设备填写后端地址。原有 GitHub Pages 演示站仍可继续使用。

## 1. 创建服务

1. 登录 https://dashboard.render.com ，关联 GitHub 账号，并授权访问 `wenku365-sudo/lead-radar`。
2. 点击 **New → Blueprint**，选择该仓库、`main` 分支和根目录下的 `render.yaml`。
3. 核对创建的资源：一个付费 Node Web Service（0.5 CPU / 512 MB）、一块 **1 GB 持久磁盘**。这会产生费用，请以创建页面确认的价格为准。不要改成无磁盘的免费服务，否则账号和任务可能在重启、重新发布后丢失。
4. 确认创建，等待构建和部署完成。成功后服务页面会显示一个 `https://...onrender.com` 地址；实际名称以平台分配为准。

本配置固定 Node 24.22.1、`npm ci --include=dev && npm run build` 构建、`npm start` 启动、`/api/health` 健康检查。`JWT_SECRET` 由平台自动生成，SQLite 存在持久目录 `/var/data/lead-radar`。平台提供 `PORT`，无需手动填写 5190。请勿设置 `GH_PAGES_BASE` 或 `VITE_STATIC_HOSTING=true`，这些仅用于 GitHub Pages 构建。

## 2. 首次登录和跨设备使用

1. 打开服务地址后加上 `/api/health`，应看到包含 `"ok":true` 的 JSON。
2. 打开服务地址后加上 `/?mode=api`，点击 **注册新账号**，设置自己的用户名和密码。公网配置默认不创建 `demo / demo123` 账号，也不导入本机数据库。
3. 在手机、平板、另一台电脑打开同一个 `/?mode=api` 地址，用同一账号登录，即可使用这个账号在云端保存的任务和客户。不同账号的数据分别归属各自用户。
4. 新账号最初没有任务和线索；可进入「AI 交代任务」创建。

## 3. 继续使用原 GitHub Pages 地址

两种方式任选：

- 临时连接：在 GitHub Pages 登录页「后端服务地址」填入 Render 服务根地址，例如 `https://实际名称.onrender.com`。不要附加 `/api`、`/api/health` 或 `/?mode=api`。这个设置仅保存在当前浏览器。
- 所有设备默认连接：GitHub 仓库 **Settings → Secrets and variables → Actions → Variables → New repository variable**，新增 `VITE_API_BASE`，值为 Render 服务根地址。然后到 **Actions → Deploy to GitHub Pages → Run workflow** 重新发布。完成后所有新打开的浏览器默认连接该后端；已有浏览器如保存过手动地址，请在登录页改回新地址。

`VITE_API_BASE` 是公开服务地址，不能填写 JWT 密钥、账号密码或第三方 API 密钥。

## 4. 数据和后续更新

- 本地 SQLite 与公网 SQLite 是独立数据库，部署不会自动上传本机客户数据。现有本地账号也不会自动出现在云端。
- 保留持久磁盘，不要删除服务/磁盘；不要把 `LR_DATA_DIR` 改到临时目录。更新代码后重新部署，保留原 `JWT_SECRET` 和磁盘。
- 当前 SQLite + 内存 WebSocket 适合单实例；需要多实例扩容时应先迁移共享数据库和消息分发。
- 本配置 `LR_COLLECTOR=mock`，因此登录、注册和数据保存是真实的，自动采集产生的客户仍是模拟数据。接入真实数据需另行配置 `LR_DOUYIN_API_BASE` 和授权数据通道；可选大模型配置放在服务端 `LLM_API_KEY`，不要放在前端变量。
- 公网默认关闭演示账号。如果明确需要演示数据，可设置 `LR_SEED_DEMO=true`，但这会开放众所周知的演示凭证，不应用于保存真实客户数据。仅当用户表为空时才会首次导入。

## 5. 验收

- `/api/health` 返回 `ok: true`。
- 注册后创建一个任务；另一台设备用同一账号登录能看到该任务。
- 手动重新部署后，原账号、任务仍然存在。
- 浏览器网络面板中的 `/ws` 成功升级，能收到 `auth_ok`。

平台说明：https://render.com/docs/blueprint-spec 、https://render.com/docs/disks 、https://render.com/docs/websocket 。
