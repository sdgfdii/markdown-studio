import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base 用相对路径：本地 dev 与 GitHub Pages 的 /<repo>/ 子路径都能正确加载资源，
// 不需要在仓库里硬编码仓库名。
export default defineConfig({
  base: './',
  plugins: [react()],
})
