import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import './styles.css'

marked.setOptions({ gfm: true, breaks: true })

const STORAGE_SOURCE = 'md-studio:source'
const STORAGE_THEME = 'md-studio:theme'

const SAMPLE = `# Markdown Studio

一个**纯前端**的 Markdown 实时预览器。所有渲染都在你的浏览器里完成，没有服务器、没有上传。

## 它是怎么上线的

| 环节 | 承担者 | 干什么 |
| --- | --- | --- |
| 1 | GitHub 仓库 | 存源码，\`push\` 即触发 |
| 2 | GitHub Actions | 云端临时机器执行 \`npm ci\` + \`npm run build\` |
| 3 | GitHub Pages | 托管 \`dist/\` 产物，给出公网地址 |

> 关键点：**构建在云端**，本机打包的产物不进仓库。

## 支持的语法

- [x] 标题、列表、引用
- [x] 表格、任务列表
- [x] 代码块与行内代码
- [ ] 你接下来想加的

\`\`\`ts
const pipeline = ['push', 'build', 'deploy'] as const
pipeline.forEach((step, i) => console.log(i + 1, step))
\`\`\`

### 试一试

删掉这段字，换成你自己的内容。左侧编辑，右侧立刻变化 —— 内容会自动存在本地，刷新不丢。

---

*Made with Vite + React + TypeScript.*
`

type Theme = 'light' | 'dark'
type ViewMode = 'split' | 'edit' | 'preview'

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function countWords(text: string): number {
  const cjk = text.match(/[\u4e00-\u9fa5\u3040-\u30ff]/g)?.length ?? 0
  const latin = text.match(/[A-Za-z0-9_'-]+/g)?.length ?? 0
  return cjk + latin
}

export default function App() {
  const [source, setSource] = useState(() => readStored(STORAGE_SOURCE, SAMPLE))
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = readStored(STORAGE_THEME, '')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [view, setView] = useState<ViewMode>('split')
  const [toast, setToast] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SOURCE, source)
    } catch {
      /* 隐私模式下写入失败，忽略 */
    }
  }, [source])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_THEME, theme)
    } catch {
      /* 同上 */
    }
  }, [theme])

  const html = useMemo(() => DOMPurify.sanitize(marked.parse(source) as string), [source])

  const stats = useMemo(() => {
    const words = countWords(source)
    return {
      chars: source.length,
      words,
      lines: source ? source.split('\n').length : 0,
      minutes: Math.max(1, Math.round(words / 300)),
    }
  }, [source])

  function notify(message: string) {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(html)
      notify('HTML 已复制')
    } catch {
      notify('复制失败，请手动选择')
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([source], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'note.md'
    a.click()
    URL.revokeObjectURL(url)
    notify('已下载 note.md')
  }

  function clearAll() {
    if (!source || window.confirm('清空当前内容？此操作不可撤销。')) {
      setSource('')
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const el = e.currentTarget
    const { selectionStart: start, selectionEnd: end } = el
    const next = source.slice(0, start) + '  ' + source.slice(end)
    setSource(next)
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 2
    })
  }

  return (
    <div className="app" data-view={view}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div className="brand-text">
            <strong>Markdown Studio</strong>
            <span>纯前端 · 本地渲染</span>
          </div>
        </div>

        <div className="view-switch" role="group" aria-label="视图切换">
          {(['edit', 'split', 'preview'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={view === mode ? 'is-active' : ''}
              onClick={() => setView(mode)}
            >
              {mode === 'edit' ? '编辑' : mode === 'split' ? '分栏' : '预览'}
            </button>
          ))}
        </div>

        <div className="actions">
          <button type="button" className="ghost" onClick={copyHtml}>
            复制 HTML
          </button>
          <button type="button" className="ghost" onClick={downloadMarkdown}>
            下载 .md
          </button>
          <button type="button" className="ghost danger" onClick={clearAll}>
            清空
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="切换主题"
            title="切换主题"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☾' : '☀'}
          </button>
        </div>
      </header>

      <main className="panes">
        <section className="pane pane-editor">
          <div className="pane-head">
            <span className="dot" />
            <span>source.md</span>
          </div>
          <textarea
            ref={textareaRef}
            value={source}
            spellCheck={false}
            placeholder="在这里写 Markdown…"
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </section>

        <section className="pane pane-preview">
          <div className="pane-head">
            <span className="dot accent" />
            <span>preview</span>
          </div>
          {source.trim() ? (
            <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="empty">
              <p>左侧写点什么，这里会实时渲染。</p>
            </div>
          )}
        </section>
      </main>

      <footer className="statusbar">
        <span>{stats.lines} 行</span>
        <span>{stats.chars} 字符</span>
        <span>{stats.words} 词</span>
        <span>约 {stats.minutes} 分钟读完</span>
        <span className="spacer" />
        <span className="muted">内容保存在本地浏览器</span>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
