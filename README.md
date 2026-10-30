# Markdown Studio

纯前端的 Markdown 实时预览器。左侧编辑，右侧即时渲染，内容存在浏览器本地，不上传任何数据。

**在线地址：** 部署完成后见仓库右侧 `About` 或 Actions 的 deploy job 输出。

## 技术栈

- Vite + React 18 + TypeScript
- `marked` 解析 Markdown，`DOMPurify` 做 XSS 消毒（渲染的是 HTML，必须消毒）
- 零后端、零接口

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 产物输出到 dist/
npm run preview    # 预览构建产物
```

## 部署链路

```
git push origin main
  → GitHub Actions（.github/workflows/deploy.yml）
  → npm ci && npm run build
  → dist/ 打包为 artifact
  → actions/deploy-pages 发布
  → https://<user>.github.io/<repo>/
```

### 首次启用

1. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**
2. 推一次 `main`，Actions 里会跑 `Deploy to GitHub Pages`
3. 跑完在 Actions 的 deploy job 里能看到 `page_url`

### 关键配置说明

| 配置 | 值 | 原因 |
| --- | --- | --- |
| `vite.config.ts` → `base` | `'./'` | 项目页地址带 `/<repo>/` 前缀，相对路径避免资源 404 |
| `permissions` | `pages: write` + `id-token: write` | Pages 官方部署走 OIDC，缺一个就 403 |
| `dist/` | 已写进 `.gitignore` | 构建在云端完成，产物不该进版本库 |
| `concurrency` | `group: pages` | 防止并发部署互相覆盖 |

## 换掉内容做自己的项目

这是套可复用的骨架。想把它变成别的项目：

1. 改 `src/App.tsx` 与 `src/styles.css`
2. 需要路由就别用 `base: './'`，改成 `base: '/<repo>/'` 并给路由加 `basename`
3. 需要后端 → Pages 不行，换 Cloudflare Pages / Vercel，或接 Supabase 之类的 BaaS

## License

MIT
