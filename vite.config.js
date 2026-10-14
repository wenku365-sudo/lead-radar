import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages 项目站点需要 /仓库名/ 前缀；CI 构建时通过 GH_PAGES_BASE 注入
  // 本地开发不传该变量，默认使用根路径
  base: process.env.GH_PAGES_BASE || '/',
  plugins: [react()],
  server: {
    port: 5188,
    strictPort: true,
    host: '127.0.0.1'
  }
})
