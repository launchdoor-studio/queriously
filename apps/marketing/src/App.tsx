import { useEffect, useState, type CSSProperties } from 'react'
import { Moon, Sun } from 'lucide-react'
import brandLogo from '../../../queriously-red-bg.png'
import { AppShellMock } from './components/AppShellMock'

type ThemeMode = 'light' | 'dark'

const GITHUB_URL = 'https://github.com/growvth/queriously'

const stagger = (index: number, step = 60): CSSProperties =>
  ({ ['--reveal-delay' as string]: `${index * step}ms` }) as CSSProperties

const capabilities = [
  {
    title: 'Document-grounded assistant',
    text: 'Ask deep technical questions and receive answers backed by exact source references.',
    artifact: 'citations://passage-links',
  },
  {
    title: 'Live annotation workspace',
    text: 'Capture claims, concerns, and action items directly beside the relevant content.',
    artifact: 'notes://marginalia-layer',
  },
  {
    title: 'Session memory across papers',
    text: 'Carry notes and citations from one document to the next so context is not lost between sessions.',
    artifact: 'memory://cross-paper-thread',
  },
  {
    title: 'Private-by-default architecture',
    text: 'Run local-first workflows with control over your data, indexing, and model configuration.',
    artifact: 'runtime://local-first',
  },
]

const workflows = [
  {
    title: 'Deep reading',
    text: 'Work through dense technical PDFs without losing the thread. Explanations, citations, and notes sit next to the page you are on.',
    output: 'Annotated reader + linked citations',
  },
  {
    title: 'Architecture and design review',
    text: 'Interrogate design docs, compare tradeoffs, and surface hidden assumptions before committing to an implementation.',
    output: 'Risk map + recommendation brief',
  },
  {
    title: 'Research synthesis',
    text: 'Turn a pile of papers into structured insights, hypotheses, and next-step questions for your own work.',
    output: 'Hypothesis board + open questions',
  },
]

const inAppToday = [
  {
    title: 'PDF library + reader',
    text: 'Open and read technical PDFs with local library management and persistent metadata.',
  },
  {
    title: 'Grounded Q&A',
    text: 'Streaming answers with citations and reading modes anchored to source passages.',
  },
  {
    title: 'Marginalia + summaries',
    text: 'Generate notes and summaries while tracking highlights and reading progress.',
  },
  {
    title: 'Session baseline',
    text: 'Create and manage paper sessions with context preserved for ongoing research.',
  },
]

const researchLog = [
  {
    tag: 'import',
    ts: '09:14',
    text: 'Imported 12 papers from internal architecture review.',
  },
  {
    tag: 'link',
    ts: '10:02',
    text: 'Linked 17 evidence passages to core deployment decision.',
  },
  {
    tag: 'export',
    ts: '11:38',
    text: 'Generated synthesis brief and exported action plan.',
  },
]

const downloadFeatures = [
  {
    label: 'Native shell',
    text: 'Tauri-based macOS app with local PDF library and persistent metadata.',
  },
  {
    label: 'Grounded Q&A',
    text: 'Streaming answers with citations anchored to source passages and pages.',
  },
  {
    label: 'Marginalia',
    text: 'Notes, highlights, and summaries kept next to the content that produced them.',
  },
  {
    label: 'Sessions',
    text: 'Paper sessions preserve context so notes and citations carry across documents.',
  },
]

const faqs = [
  {
    question: 'Who is Queriously for?',
    answer:
      'Individual engineers, researchers, and technical operators who read a lot of dense PDFs and want grounded answers and notes without leaving the paper.',
  },
  {
    question: 'What platforms are supported?',
    answer:
      'Queriously is a native macOS desktop app (Apple Silicon and Intel). Other platforms may follow; the current focus is shipping a polished macOS build first.',
  },
  {
    question: 'Can I bring my own model provider?',
    answer:
      'Yes. BYOK is supported. Point Queriously at your preferred provider and keep the reader, citations, and session state local.',
  },
  {
    question: 'How does Queriously handle my data?',
    answer:
      'The app is local-first: your library, highlights, notes, and sessions stay on your machine. Model calls only leave the device when you explicitly send a request to a provider you configured.',
  },
  {
    question: 'Is it usable today?',
    answer:
      'Yes. v0.1 is in active development but already useful day to day. Signed installers will be published on this page; for now it runs from a local developer build.',
  },
]

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <img src={brandLogo} alt="" />
    </span>
  )
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: ThemeMode
  onToggle: () => void
}) {
  const nextLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  return (
    <button
      className="icon-button"
      type="button"
      onClick={onToggle}
      aria-label={nextLabel}
      title={nextLabel}
    >
      <span className="icon-button-glyph" aria-hidden="true">
        {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
      </span>
    </button>
  )
}

function GithubLink() {
  return (
    <a
      className="icon-button"
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Queriously on GitHub"
      title="View source on GitHub"
    >
      <svg
        className="icon-button-glyph"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.79 8.21 11.38.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.87.12 3.17.77.84 1.24 1.91 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.82 1.1.82 2.22 0 1.61-.02 2.9-.02 3.3 0 .32.22.69.82.57C20.57 22.28 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z" />
      </svg>
    </a>
  )
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [openFaq, setOpenFaq] = useState<number>(0)

  useEffect(() => {
    const saved = localStorage.getItem('queriously-theme') as ThemeMode | null
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved)
      document.documentElement.dataset.theme = saved
      return
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const fallback = prefersDark ? 'dark' : 'light'
    setTheme(fallback)
    document.documentElement.dataset.theme = fallback
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const targets = document.querySelectorAll<HTMLElement>('.reveal')

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-revealed', 'true'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).setAttribute('data-revealed', 'true')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleThemeToggle = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('queriously-theme', next)
    document.documentElement.dataset.theme = next
  }

  return (
    <div className="site-shell">
      <header className="nav-wrap">
        <div className="container nav-inner">
          <div className="brand">
            <BrandMark />
            <span className="brand-word">Queriously</span>
          </div>
          <div className="nav-actions">
            <GithubLink />
            <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <span className="hero-halftone" aria-hidden="true" />
          <div className="container hero-shell">
            <div className="hero-grid">
              <div className="hero-content">
                <p className="kicker reveal" style={stagger(0)}>macOS desktop app</p>
                <h1 className="reveal" style={stagger(1)}>Technical decisions, with defensible evidence.</h1>
                <p className="hero-copy reveal" style={stagger(2)}>
                  Queriously is a local-first desktop reader for technical PDFs. Answers cite the
                  source passage, and your library, notes, and sessions stay on your machine. Early
                  builds are in active development and usable day to day.
                </p>
                <div className="hero-cta-row reveal" style={stagger(3)}>
                  <a className="hero-status-chip" href="#download">
                    <span className="hero-status-chip-dot" aria-hidden="true" />
                    <span className="hero-status-chip-label">v0.1 · macOS</span>
                    <span className="hero-status-chip-divider" aria-hidden="true" />
                    <span className="hero-status-chip-action">Coming soon →</span>
                  </a>
                  <a className="hero-status-link" href="#shipped">
                    See what works today
                  </a>
                </div>
                <p className="hero-note reveal" style={stagger(4)}>
                  Native app · BYOK · Source-cited output. Installers will be published on this
                  site; for now the app runs from a local developer build.
                </p>
              </div>
              <aside className="hero-panel reveal" style={stagger(2)} role="presentation">
                <div className="hero-panel-head">
                  <div className="hero-panel-head-left">
                    <span className="dot"></span>
                    <span>Live workspace snapshot</span>
                  </div>
                  <span className="panel-badge">Synced</span>
                </div>
                <p className="hero-panel-title">Model serving architecture decision · Q3 planning</p>
                <div className="panel-body">
                  <p className="panel-label">Question under review</p>
                  <p className="panel-question">
                    Which serving architecture gives the best latency-to-cost profile at
                    projected peak traffic?
                  </p>
                  <div className="panel-insight">
                    <p className="panel-label">Recommended direction</p>
                    <p className="panel-summary">
                      GPU micro-batching improves p95 latency by 23% while maintaining
                      cost ceilings under burst load.
                    </p>
                  </div>
                  <div className="panel-status">
                    <span>17 linked citations</span>
                    <span>5 active reviewers</span>
                    <span>brief ready</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="section app-preview-section" id="app-preview" aria-labelledby="app-preview-heading">
          <span className="app-preview-halftone app-preview-halftone--left" aria-hidden="true" />
          <span className="app-preview-halftone app-preview-halftone--right" aria-hidden="true" />
          <div className="container">
            <div className="section-head section-head-narrow reveal">
              <p className="kicker">Interface</p>
              <h2 id="app-preview-heading">The Queriously workspace</h2>
              <p className="section-copy">
                Library, PDF reader, and chat in the same three-panel layout as the desktop app.
              </p>
            </div>
            <figure
              className="app-mock-frame reveal"
              style={stagger(1)}
              aria-label="Queriously app: library, PDF reader, chat, and status bar (illustration)"
            >
              <AppShellMock theme={theme} variant="showcase" />
            </figure>
          </div>
        </section>

        <section className="section research-log" aria-labelledby="research-log-heading">
          <div className="container">
            <div className="section-head section-head-narrow reveal">
              <p className="kicker">Research log</p>
              <h2 id="research-log-heading">Track evidence as your understanding evolves.</h2>
              <p className="section-copy">
                Every import, link, and export writes a timestamped entry you can audit and
                replay. The log sits between the reading you do and the decisions you ship.
              </p>
            </div>
            <div className="log-terminal reveal" style={stagger(1)} role="group" aria-label="Paper session log">
              <div className="log-terminal-bar">
                <span className="log-terminal-dot" />
                <span className="log-terminal-dot" />
                <span className="log-terminal-dot" />
                <span className="log-terminal-title">paper-session.log</span>
                <span className="log-terminal-meta" aria-hidden="true">3 entries · today</span>
              </div>
              <ol className="log-list">
                {researchLog.map((entry, idx) => (
                  <li key={entry.text} className="log-row reveal" style={stagger(idx + 2, 90)}>
                    <span className="log-row-num" aria-hidden="true">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="log-row-ts" aria-hidden="true">{entry.ts}</span>
                    <span className="log-row-tag" aria-hidden="true">{entry.tag}</span>
                    <span className="log-row-text">{entry.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="section" id="shipped" aria-labelledby="shipped-heading">
          <div className="container">
            <div className="section-head section-head-narrow reveal">
              <p className="kicker">What&apos;s shipped</p>
              <h2 id="shipped-heading">Working today in v0.1.</h2>
              <p className="section-copy">
                The app is early but already useful. These are the pieces you can rely on right
                now; the rest is what v0.1 is built on top of.
              </p>
            </div>
            <div className="in-app-grid">
              {inAppToday.map((item, idx) => (
                <article key={item.title} className="deployment-item reveal" style={stagger(idx, 80)}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="capabilities">
          <div className="container">
            <div className="section-head section-head-narrow reveal">
              <p className="kicker">Capabilities</p>
              <h2>Research primitives, not generic chat features.</h2>
              <p className="section-copy">
                The pieces Queriously is built around. Each one stays tied to the source you are
                actually reading, not a generic assistant on the side.
              </p>
            </div>
            <div className="capability-cluster">
              {capabilities.map((item, idx) => (
                <article key={item.title} className="capability-module reveal" style={stagger(idx, 80)}>
                  <p className="module-meta">
                    <span className="list-index">{String(idx + 1).padStart(2, '0')}</span>
                    <code>{item.artifact}</code>
                  </p>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="workflows">
          <div className="container">
            <div className="section-head section-head-narrow reveal">
              <p className="kicker">Use cases</p>
              <h2>Built for people who read to decide.</h2>
              <p className="section-copy">
                Whether you&apos;re working through a single dense paper or triangulating across
                a dozen, Queriously keeps the evidence trail intact while you think.
              </p>
            </div>
            <div className="usecase-spec">
              {workflows.map((item, idx) => (
                <article key={item.title} className="usecase-row reveal" style={stagger(idx, 90)}>
                  <div className="usecase-rail" aria-hidden="true">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="usecase-body">
                    <h3>{item.title}</h3>
                    <p className="usecase-emit">
                      <code>{item.output}</code>
                    </p>
                    <p className="usecase-desc">{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container">
            <div className="section-head section-head-narrow reveal">
              <p className="kicker">FAQ</p>
              <h2>Things people ask about Queriously.</h2>
            </div>
            <div className="faq-list">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx
                const answerId = `faq-answer-${idx}`
                return (
                  <article
                    key={faq.question}
                    className={`faq-item reveal${isOpen ? ' faq-item--open' : ''}`}
                    style={stagger(idx, 70)}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                    >
                      <span>{faq.question}</span>
                      <span className="faq-plus" data-open={isOpen} aria-hidden="true">
                        +
                      </span>
                    </button>
                    <div
                      id={answerId}
                      className="faq-answer"
                      role="region"
                      aria-hidden={!isOpen}
                    >
                      <div className="faq-answer-inner">
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="cta-band" id="download" aria-labelledby="download-heading">
          <span className="cta-halftone" aria-hidden="true" />
          <div className="container cta-inner">
            <div className="download-grid">
              <header className="download-lede reveal">
                <p className="kicker">Download</p>
                <h2 id="download-heading">Desktop builds for macOS</h2>
                <p className="section-copy">
                  Queriously is a native macOS app built with Tauri. Signed release installers
                  will be published here. Local PDF library, cited Q&amp;A, marginalia, and
                  sessions are in the tree today.
                </p>
                <ul className="download-features" aria-label="What's in the build">
                  {downloadFeatures.map((feature, idx) => (
                    <li key={feature.label} className="download-feature reveal" style={stagger(idx + 1, 70)}>
                      <span className="download-feature-label">{feature.label}</span>
                      <span className="download-feature-text">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </header>

              <aside className="download-card reveal" style={stagger(1)} aria-label="Build status">
                <div className="download-card-head">
                  <span className="download-card-tag">v0.1.0 · macOS</span>
                  <span className="download-card-status">
                    <span className="download-card-status-dot" aria-hidden="true" />
                    Coming soon
                  </span>
                </div>
                <p className="download-card-title">Release installers pending signing.</p>
                <p className="download-card-copy">
                  We&apos;re preparing notarized <code>.dmg</code> binaries plus checksums.
                  They&apos;ll be linked from this page as soon as they ship.
                </p>
                <dl className="download-card-spec">
                  <div>
                    <dt>Platform</dt>
                    <dd>macOS 12+ · Apple Silicon &amp; Intel</dd>
                  </div>
                  <div>
                    <dt>Runtime</dt>
                    <dd>Tauri · local-first · BYOK</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>Active development · usable daily</dd>
                  </div>
                </dl>
                <p className="download-card-hint">
                  Check back here for DMG links and release notes.
                </p>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-mini">
          <div className="footer-group footer-brand">
            <BrandMark />
            <span className="brand-word">Queriously</span>
          </div>
          <p className="footer-group footer-meta">v0.1.0 · macOS desktop · Made for research teams</p>
        </div>
      </footer>
    </div>
  )
}

export default App
