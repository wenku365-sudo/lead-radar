# 线索雷达 · 部署说明（供 AI / 工程师阅读）

## 项目概况 

- **产品名：** 线索雷达（AI 自动获客演示平台）
- **技术栈：** React 18 + Vite 5，纯前端单页应用（SPA）
- **后端/数据库：** 无。所有数据为前端 mock 数据，无任何真实 API 调用、无爬虫、无登录
- **路由：** 页面切换由 React 内部状态管理，无 URL 路由（无 history fallback 需求，但建议仍按 SPA 标准配置）

## 两种部署方式

### 方式一：直接部署 dist/（推荐，已构建好）

仓库内 `dist/` 目录是已完成的 生产构建产物（vite v5.4.21 构建通过），**静态托管即可**：

- 上传 `dist/` 目录内全部内容（index.html + assets/）到任意静态服务器
- Nginx 示例：

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/lead-radar/dist;
  index index.html;
  location / {
    try_files $uri $uri /index.html;
  }
}
```

- 其他等价方案：Vercel / Netlify / Cloudflare Pages / GitHub Pages / 对象静态托管均可，框架预设选 "Vite" 或 "静态站点"
- 注意：字体使用 Google Fonts CDN（DM Sans + Noto Sans SC），部署环境需能访问 fonts.googleapis.com，否则自动回退系统字体，不影响功能

### 方式二：从源码重新构建

要求 Node.js ≥ 18：

```bash
npm install        # Windows 下若报 esbuild 平台包缺失，补装：npm install @esbuild/win32-x64 --no-save
npm run build      # 产物输出到 dist/
npm run preview    # 本地预览构建产物（端口 5188）
```

本地开发：`npm run dev`（端口 5188，strictPort）。

## 构建产物结构

```
dist/
├── index.html          # 入口（引用 Google Fonts）
└── assets/
    ├── index-*.css     # 全部样式（约 29KB）
    └── index-*.js      # 全部逻辑（约 194KB，gzip 69KB）
```

## 校验清单（部署后自查）

1. 打开首页可见深色大首屏，主标题「自动获客 / AI 获客 / 让客户主动出现」
2. 顶部导航五个页面均可切换：首页 / AI 交代任务 / 工作台 / 采集数据 / 意向客户
3. 「AI 交代任务」页输入任务 → 生成任务 → 开始采集，弹出 980px 采集动画弹窗（四阶段约 22 秒，不自动关闭）
4. 「意向客户」页 372 条数据，行业/平台/意向/搜索筛选正常，点击行打开右侧详情抽屉
5. 移动端视口（≤640px）布局自适应正常

## 目录结构（源码）

```
lead-radar/
├── index.html
├── package.json
├── vite.config.js      # 端口 5188，host 127.0.0.1
├── dist/               # 生产构建产物（可直接部署）
└── src/
    ├── main.jsx        # 入口
    ├── App.jsx         # 全局状态（客户/任务/采集弹窗）+ 页面切换
    ├── index.css       # 全局样式（含响应式）
    ├── data/mock.js    # 全部 mock 数据引擎（7 行业 372 条客户、关键词标红、AI 任务理解）
    ├── components/
    │   └── CollectModal.jsx   # 四阶段采集动画弹窗
    └── pages/
        ├── Home.jsx          # 首页（深色发布会风）
        ├── TaskCreate.jsx    # AI 交代任务（聊天式）
        ├── Workbench.jsx     # 工作台
        ├── Collection.jsx    # 采集数据
        └── Customers.jsx     # 意向客户（筛选 + 详情抽屉）
```
