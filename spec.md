# Queriously — Research Copilot
### Product Specification Document
**Version:** 1.2.0-draft  
**Stack:** Tauri 2 · Rust · React 18 · TypeScript · Tailwind CSS · Lucide Icons  
**Status:** Pre-development — Ready for implementation  
**Last Updated:** April 2026  
**Changelog:**
- v1.2 — All 15 open questions resolved. No remaining undecided items. Spec is implementation-ready.
- v1.1 — Sharpened product differentiation. Added Marginalia Engine and Research Sessions. Removed Discovery panel and Concept Map. Trimmed Summarization modes. Introduced Reading Modes for Chat.

---

## Table of Contents

1. [Vision & Philosophy](#1-vision--philosophy)
2. [Stack Decision & Rationale](#2-stack-decision--rationale)
3. [Feature Set](#3-feature-set)
4. [Architecture Overview](#4-architecture-overview)
5. [Project Structure](#5-project-structure)
6. [Backend (Rust + Python Sidecar)](#6-backend-rust--python-sidecar)
7. [Frontend (React + Tauri)](#7-frontend-react--tauri)
8. [Feature Specifications](#8-feature-specifications)
   - 8.1 PDF Viewer & Workspace
   - 8.2 Reading Modes & QA Engine (RAG)
   - 8.3 Selection-Based QA
   - 8.4 Marginalia Engine ★ NEW
   - 8.5 Research Sessions ★ NEW
   - 8.6 Equation Extraction & Plotting
   - 8.7 Summarization Engine
   - 8.8 Citation & Reference Tracker
   - 8.9 Reading Progress & Annotations
9. [Data Models](#9-data-models)
10. [API Contract (IPC / Python RPC)](#10-api-contract-ipc--python-rpc)
11. [UI/UX Specification](#11-uiux-specification)
12. [Phased Delivery Plan](#12-phased-delivery-plan)
13. [Tech Dependencies](#13-tech-dependencies)
14. [Testing Strategy](#14-testing-strategy)
15. [Open Questions & Decisions Log](#15-open-questions--decisions-log)

---

## 1. Vision & Philosophy

**Queriously** is a local-first research reader that thinks alongside you while you read. It is not a library manager, a reference organiser, or a chatbot that happens to have read your PDF. Its job is narrower and more deliberate: to make the act of reading a difficult paper more productive by sitting in the margins with you.

Most tools answer *"what does this paper say?"* Queriously is built to answer *"help me think about what this paper means."* That distinction drives every product decision.

### The Problem with Existing Tools

Zotero, Mendeley, and similar tools are excellent at organising papers. They are not reading tools. AI wrappers like ChatPDF and AskYourPDF answer questions about papers, but they do so passively — you have to know what to ask, and the answer lives in a chat window disconnected from the page you're reading. What's missing is an AI layer that participates in the reading experience itself, not just the querying experience.

### What Queriously Does Differently

Two features set Queriously apart from anything currently available:

**Marginalia** — After indexing, Queriously generates AI-written notes directly in the margins of the paper. Not in a sidebar. In the margins. These notes flag contradictions, restate dense claims in plain language, and surface the paper's core assumptions — the things a smart colleague would whisper to you as you read. No other tool does this.

**Research Sessions** — A session is a named investigation with a central question. It holds the papers you've read toward that question, your annotations, your conversation history, and an auto-generated synthesis of what you've learned so far. This makes literature review a first-class workflow rather than something you manage manually in a doc alongside your reader.

### Core Principles

- **Local-first, always.** PDFs never leave the machine unless the user opts into a cloud LLM. All embeddings, vector stores, annotations, and marginalia are stored locally. No account required. This is a headline feature, not a footnote.
- **BYOK / BYOM.** Works with Ollama (fully offline), OpenAI, Anthropic, or any LiteLLM-compatible endpoint. The user owns the intelligence layer.
- **The paper is the source of truth.** Every AI response is grounded and cited to a specific page and section. Confidence indicators surface when the model is guessing.
- **The reading canvas is primary.** AI is a participant in reading, not a replacement for it. Marginalia, the floating toolbar, and the chat panel are all designed to minimise context-switching away from the page.
- **Opinionated defaults, configurable internals.** Works immediately with Ollama and a sensible default model. Power users can swap every component from embeddings to chunking strategy.

---

## 2. Stack Decision & Rationale

### Why Tauri 2 over Flutter

| Concern | Flutter | Tauri 2 |
|---|---|---|
| Bundle size | ~50–80 MB | ~10–15 MB |
| Web ecosystem access | Dart ecosystem only | Full npm/React ecosystem |
| Native OS integration | Good, but abstracted | Excellent via Rust |
| Rendering engine | Custom (Skia/Impeller) | System WebView (fast startup) |
| Developer experience | Good, but Dart is niche | TypeScript + React is universal |
| PDF rendering | flutter_pdfview (limited) | pdfjs-dist (battle-tested, full-featured) |
| Community for AI tooling | Limited | npm has everything |

### Core Stack

| Layer | Technology | Reason |
|---|---|---|
| Desktop shell | Tauri 2 (Rust) | Low overhead, native IPC, excellent OS APIs |
| Frontend framework | React 18 + TypeScript | Mature, vast ecosystem, team familiarity |
| Styling | Tailwind CSS v3 | Utility-first, no runtime overhead |
| Icons | Lucide React | Consistent, lightweight, tree-shakable |
| PDF rendering | pdfjs-dist (Mozilla) | Industry standard, well-maintained |
| State management | Zustand | Minimal, TypeScript-first, no boilerplate |
| AI/ML backend | Python 3.11 (sidecar process) | Best ML ecosystem; Rust calls Python as subprocess |
| LLM interface | LiteLLM | Unified interface for Ollama, OpenAI, Anthropic, etc. |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Fast, local, no API key needed |
| Vector store | ChromaDB (local persistence) | Simple, Python-native, no infra required |
| PDF parsing | PyMuPDF (fitz) + pdfplumber | PyMuPDF for speed, pdfplumber for table/layout extraction |
| Equation parsing | latex2sympy2 + sympy | Parse LaTeX → symbolic math → evaluatable |
| Plotting | matplotlib → base64 PNG | Simple, headless, universally renderable |
| IPC protocol | Tauri Commands (JSON-RPC over IPC) | Type-safe, low latency, built-in to Tauri |
| Local DB | SQLite via rusqlite | Paper metadata, annotations, sessions |
| Build tooling | Vite | Fast HMR, native ESM |

---

## 3. Feature Set

This section documents the full feature set with rationale for what was kept, changed, added, and cut. All decisions are driven by the product thesis: Queriously is an active reading tool, not a library manager.

### Core Features (Shipping)

- ✅ **PDF Viewer** — `pdfjs-dist` in React. Full text layer, native selection, virtualized page rendering.
- ✅ **Reading Modes + QA Engine** — RAG pipeline with ChromaDB. Chat panel with four distinct reading modes: Explain, Challenge, Connect, Annotate. Same backend, different AI participation patterns.
- ✅ **Selection-Based QA** — Selected text sent as context override, bypassing vector search. Floating toolbar with AI action shortcuts.
- ✅ **Marginalia Engine** ★ — AI-generated margin notes rendered directly alongside the PDF. Flags contradictions, restates dense claims, surfaces core assumptions. Generated once on ingest, stored locally, fully editable.
- ✅ **Research Sessions** ★ — Named investigation workspaces. Each session holds a central research question, linked papers, all annotations and chat history, and an auto-generated synthesis of findings so far.
- ✅ **Equation Extraction & Plotting** — KaTeX inline rendering + matplotlib plots for plottable functions.
- ✅ **Summarization Engine** — Three modes: Bullet Points, Critical Review, ELI5. Section-level and selection-level scope.
- ✅ **Citation & Reference Tracker** — Bibliography parsing, DOI/arXiv links, BibTeX export. Minimal, not a full reference manager.
- ✅ **Reading Progress & Annotations** — Time-on-page heatmap, persistent highlights, sticky notes. All stored by file hash, not path.
- ✅ **Export Pack** — Annotations, Q&A history, marginalia, and synthesis exported as Markdown or JSON.

### Challenged & Changed from v1.0

- ⚠️ **Generic Chat → Reading Modes** — The original spec had a plain chatbox. v1.1 wraps the same RAG backend in four intentional reading modes (Explain, Challenge, Connect, Annotate) that change the AI's role in the conversation. Not more features — a reframe of the existing one.
- ⚠️ **"Visualize equations" as PNG only → KaTeX first, matplotlib on demand** — Inline rendering is instant and requires no Python round-trip. matplotlib is only invoked when the user explicitly wants to plot a function over a domain.
- ⚠️ **FAISS → ChromaDB** — Better metadata filtering (page range, section), native persistence, simpler ops.
- ⚠️ **Multi-paper mode → Scoped to Research Sessions** — The original spec had a general "pin papers to context pool" mechanic. In v1.1, multi-paper context is tied to Sessions with an explicit research question, giving it intent and making it more useful.
- ⚠️ **Summarization modes: 5 → 3** — Removed "Abstract" (researchers can ask for it in chat) and "Methods only" (same). Kept Bullets, Critical Review, and ELI5 as genuinely distinct output formats that the chat interface doesn't naturally produce.

### Cut from v1.0

- ❌ **Discovery Panel (Semantic Scholar / arXiv integration)** — Useful but not differentiating. Competes with better-established tools. Adds network dependency and scope. Deferred indefinitely.
- ❌ **Concept Map / Knowledge Graph** — Interesting but ResearchRabbit does citation graphs better, and entity extraction is noisy enough that the feature risks feeling half-baked. The Session Synthesis feature covers the "what connects across papers" need more reliably.
- ❌ **Clipboard Intelligence** — Clever but introduces unpredictable UX. Cut.
- ❌ **Library tags and advanced filtering** — Queriously is not a reference manager. A flat recency-sorted list of opened papers is enough. Tags add maintenance burden for the user and scope for the team.
- ❌ **Reading List (queued undownloaded papers)** — Removed with the Discovery panel.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tauri Shell (Rust)                       │
│                                                                 │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │     React UI (WebView)       │  │    Rust Core Layer       │ │
│  │                              │  │                          │ │
│  │  - PDF Viewer (pdfjs)        │  │  - File system ops       │ │
│  │  - Chat / QA Panel           │  │  - SQLite (annotations,  │ │
│  │  - Equation Renderer (KaTeX) │  │    sessions, metadata)   │ │
│  │  - Graph View (D3/Vis)       │  │  - Sidecar process mgmt  │ │
│  │  - Settings / Onboarding     │  │  - OS clipboard access   │ │
│  │                              │  │  - Window management     │ │
│  └──────────┬───────────────────┘  └──────────┬───────────────┘ │
│             │ Tauri Commands (IPC)             │                 │
└─────────────┼─────────────────────────────────┼─────────────────┘
              │                                 │
              ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Python Sidecar Process                        │
│                   (FastAPI / JSON-RPC server)                   │
│                                                                 │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  PDF Pipeline  │  │  RAG Engine  │  │  Math Engine        │  │
│  │                │  │              │  │                     │  │
│  │  PyMuPDF       │  │  ChromaDB    │  │  PyMuPDF (math      │  │
│  │  pdfplumber    │  │  sentence-   │  │  region detection)  │  │
│  │  Chunking      │  │  transformers│  │  latex2sympy2       │  │
│  │  Layout parse  │  │  LiteLLM     │  │  sympy              │  │
│  └────────────────┘  └──────────────┘  │  matplotlib         │  │
│                                        └─────────────────────┘  │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Cite Engine   │  │  Marginalia  │  │  Session Synthesis  │  │
│  │                │  │  Engine      │  │  Engine             │  │
│  │  regex parse   │  │              │  │                     │  │
│  │  DOI resolver  │  │  Contradiction│  │  Cross-paper RAG    │  │
│  └────────────────┘  │  detection   │  │  Synthesis prompt   │  │
│                      │  Assumption  │  │  Structured JSON    │  │
│                      │  flagging    │  │  output             │  │
│                      │  Plain-lang  │  └─────────────────────┘  │
│                      │  restatement │                           │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Local Storage Layer                                │
│                                                                 │
│  ~/.queriously/                                                 │
│  ├── db/           SQLite (papers.db, annotations.db,           │
│  │                         marginalia.db, sessions.db)          │
│  ├── vectors/      ChromaDB persistent collections             │
│  ├── cache/        Parsed PDF text, chunk JSON                  │
│  └── exports/      Generated reports, plots, session exports    │
└─────────────────────────────────────────────────────────────────┘
```

### IPC Communication Pattern

Tauri's IPC bridge is used for all communication between the React frontend and the Rust core. The Rust core manages the Python sidecar and proxies long-running AI calls asynchronously, emitting progress events back to the frontend via Tauri's event system.

```
React (invoke) → Tauri Command (Rust) → Python Sidecar (HTTP/JSON-RPC)
React (listen) ← Tauri Event          ← Python Sidecar (streaming response)
```

For streaming LLM responses, Python sends token-by-token chunks via stdout/pipe which Rust relays as `tauri::Event` emissions to the frontend. This enables real-time token streaming in the chat UI without WebSockets.

---

## 5. Project Structure

```
queriously/
├── src-tauri/                    # Rust/Tauri backend
│   ├── src/
│   │   ├── main.rs               # App entry, window setup
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── pdf.rs            # PDF open, read, validate
│   │   │   ├── ai.rs             # Proxy to Python sidecar
│   │   │   ├── annotations.rs    # SQLite CRUD for highlights/notes
│   │   │   ├── marginalia.rs     # SQLite CRUD for margin notes
│   │   │   ├── session.rs        # Research session management
│   │   │   └── export.rs         # Export pack commands
│   │   ├── sidecar.rs            # Python sidecar lifecycle
│   │   ├── db.rs                 # rusqlite setup and migrations
│   │   └── clipboard.rs          # OS clipboard monitoring
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── pdf/
│   │   │   ├── PDFViewer.tsx          # pdfjs canvas + text layer
│   │   │   ├── PageThumbnails.tsx
│   │   │   ├── TextSelectionOverlay.tsx
│   │   │   ├── AnnotationLayer.tsx
│   │   │   ├── MarginaliaLayer.tsx    # AI margin notes overlay
│   │   │   └── Heatmap.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ReadingModeSelector.tsx # Explain/Challenge/Connect/Annotate
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── SourceCitation.tsx     # Click to jump to page
│   │   │   └── StreamingText.tsx
│   │   ├── marginalia/
│   │   │   ├── MarginaliaNote.tsx     # Single margin note card
│   │   │   └── MarginaliaControls.tsx # Toggle, filter, generate
│   │   ├── sessions/
│   │   │   ├── SessionPanel.tsx       # Session overview + synthesis
│   │   │   ├── SessionCard.tsx        # Session list item
│   │   │   └── SynthesisView.tsx      # Cross-paper synthesis display
│   │   ├── equations/
│   │   │   ├── EquationList.tsx
│   │   │   ├── EquationCard.tsx       # KaTeX inline + plot trigger
│   │   │   └── PlotModal.tsx
│   │   ├── citations/
│   │   │   ├── ReferenceList.tsx
│   │   │   └── ReferenceCard.tsx
│   │   ├── library/
│   │   │   ├── LibraryPanel.tsx
│   │   │   └── PaperCard.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── PanelDivider.tsx       # Resizable split pane
│   │   │   └── TabBar.tsx
│   │   └── ui/                        # Shared primitives
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Tooltip.tsx
│   │       ├── Badge.tsx
│   │       └── Spinner.tsx
│   ├── store/
│   │   ├── pdfStore.ts                # Active PDF state (Zustand)
│   │   ├── chatStore.ts               # Conversation history + reading mode
│   │   ├── annotationStore.ts         # Highlights + notes
│   │   ├── marginaliaStore.ts         # Margin notes state
│   │   ├── sessionStore.ts            # Research sessions
│   │   └── settingsStore.ts           # User preferences, LLM config
│   ├── hooks/
│   │   ├── usePDF.ts
│   │   ├── useChat.ts
│   │   ├── useAnnotations.ts
│   │   ├── useMarginalia.ts
│   │   ├── useSessions.ts
│   │   └── useSelection.ts
│   ├── lib/
│   │   ├── tauri.ts                   # Typed invoke wrappers
│   │   ├── pdfjs.ts                   # pdfjs initialization
│   │   ├── katex.ts                   # LaTeX rendering helpers
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
│
├── python/                       # Python AI sidecar
│   ├── main.py                   # FastAPI app entry
│   ├── routers/
│   │   ├── ingest.py             # PDF parsing + indexing
│   │   ├── qa.py                 # RAG question answering (all modes)
│   │   ├── marginalia.py         # Margin note generation
│   │   ├── sessions.py           # Session synthesis
│   │   ├── summarize.py          # Summarization endpoints
│   │   ├── equations.py          # Math extraction + plotting
│   │   └── citations.py          # Reference extraction
│   ├── core/
│   │   ├── pdf_parser.py         # PyMuPDF + pdfplumber pipeline
│   │   ├── chunker.py            # Text chunking strategy
│   │   ├── embedder.py           # sentence-transformers wrapper
│   │   ├── vector_store.py       # ChromaDB wrapper
│   │   ├── llm.py                # LiteLLM wrapper
│   │   ├── reading_modes.py      # Prompt templates per reading mode
│   │   ├── marginalia_engine.py  # Margin note generation pipeline
│   │   ├── synthesis_engine.py   # Cross-paper session synthesis
│   │   ├── math_engine.py        # LaTeX extraction + sympy
│   │   └── cite_parser.py        # Reference parsing
│   ├── models/
│   │   └── schemas.py            # Pydantic models
│   └── requirements.txt
│
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── spec.md                       # This document
```

---

## 6. Backend (Rust + Python Sidecar)

### 6.1 Rust Layer Responsibilities

The Rust layer handles everything that needs native OS access or where performance is critical. It deliberately does **not** contain AI logic.

- **File system access** — Opening PDFs, reading/writing the SQLite database, managing the `~/.queriously/` directory.
- **Sidecar management** — Spawning, health-checking, and gracefully shutting down the Python process. The Python sidecar is bundled as a compiled binary (via PyInstaller) inside the Tauri app bundle.
- **IPC command handlers** — Wrapping Python API calls as typed Tauri commands that the React layer can `invoke()`.
- **Streaming relay** — Reading Python's streamed token output and re-emitting as Tauri events.
- **Clipboard monitoring** — Using OS APIs to watch for clipboard changes and notify React.
- **SQLite persistence** — Annotations, highlights, reading sessions, paper metadata. Python only reads from this via the sidecar API.

### 6.2 Python Sidecar — Startup Sequence

1. Tauri spawns `queriously-ai-sidecar` on app launch.
2. Sidecar starts FastAPI on `localhost:PORT` (PORT is randomly assigned and passed to Tauri via stdout first line).
3. Sidecar signals "ready" by writing `{"status": "ready", "port": PORT}` to stdout.
4. Rust reads this, stores the port, and the app marks AI features as available.
5. On first PDF open, if no model is configured, the Settings onboarding flow is triggered.

### 6.3 PDF Parsing Pipeline

Triggered when a user opens a new PDF. Runs once per paper (result cached in `~/.queriously/cache/<paper_id>/`).

```
Input: PDF file path
         │
         ▼
┌─────────────────────────────────┐
│ Step 1: Metadata Extraction     │
│ PyMuPDF → title, authors,       │
│ abstract, page count, TOC       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Step 2: Full Text Extraction    │
│ PyMuPDF → raw text per page     │
│ pdfplumber → tables, columns    │
│ Layout analysis → section labels│
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Step 3: Math Detection          │
│ Regex + heuristics to find      │
│ $...$ and $$...$$ regions        │
│ Store as (page, bbox, raw_latex) │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Step 4: Chunking                │
│ Strategy: recursive semantic    │
│ chunking with section awareness │
│ Chunk size: ~512 tokens         │
│ Overlap: 64 tokens              │
│ Each chunk tagged with:         │
│   - page_number                 │
│   - section_title               │
│   - chunk_index                 │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Step 5: Embedding               │
│ sentence-transformers           │
│ all-MiniLM-L6-v2                │
│ Batch embed all chunks          │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Step 6: Vector Store            │
│ ChromaDB collection per paper   │
│ ID: "paper_{sha256_of_path}"    │
│ Store: embedding + metadata     │
└─────────────────────────────────┘
Output: paper_id, chunk_count, equations[], citations[]
```

### 6.4 RAG Question-Answering Pipeline

```
Input: question (str), paper_id (str), context_chunks? (optional override)
         │
         ▼
┌──────────────────────────────────┐
│ 1. Embed question                │
│    sentence-transformers         │
└───────────────┬──────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│ 2. Retrieve top-k chunks         │
│    ChromaDB similarity search    │
│    k = 5 (default), filterable   │
│    by page range or section      │
└───────────────┬──────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│ 3. Re-rank (optional)            │
│    Cross-encoder reranking       │
│    ms-marco-MiniLM-L-6-v2        │
│    (enabled only if model loaded)│
└───────────────┬──────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│ 4. Prompt construction           │
│    System: research assistant    │
│    Context: top chunks with      │
│      page refs & section labels  │
│    User: question                │
│    Instruction: cite page #s     │
└───────────────┬──────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│ 5. LLM call (via LiteLLM)        │
│    Streaming response            │
│    Model: configurable           │
│    Default: ollama/llama3.2      │
└───────────────┬──────────────────┘
                │
                ▼
Output: {
  answer: string (streamed),
  sources: [{page, section, chunk_text, score}],
  confidence: low|medium|high
}
```

---

## 7. Frontend (React + Tauri)

### 7.1 Layout

The app uses a three-panel layout (inspired by VS Code and Zotero):

```
┌────────────────────────────────────────────────────────────────┐
│  TopBar: [Logo] [File: Paper Title] [Tab bar] [Settings]       │
├──────────┬─────────────────────────────────┬───────────────────┤
│          │                                 │                   │
│ Sidebar  │      PDF Viewer Canvas          │  Right Panel      │
│          │                                 │                   │
│ [Library]│  Page renders here.             │  Tabs:            │
│ [TOC]    │  Text layer for selection.      │  [Chat]           │
│ [Thumbs] │  Annotation overlay.            │  [Equations]      │
│ [Session]│  Marginalia in right gutter.    │  [Citations]      │
│          │                                 │  [Summary]        │
│          │                                 │                   │
├──────────┴─────────────────────────────────┴───────────────────┤
│  Status bar: [Page X/Y] [Zoom] [Marginalia ●] [AI status]      │
└────────────────────────────────────────────────────────────────┘
```

All panel dividers are draggable. The right panel can be collapsed. The sidebar can be pinned or set to hover-reveal mode. The layout state is persisted per-paper.

### 7.2 Theme System

Queriously uses a CSS variable-based theme system with three built-in themes:

- **Queriously Dark** (default) — Deep charcoal backgrounds, amber/gold accents. Designed for long reading sessions.
- **Scholar Light** — Warm off-white, ink-blue accents. For daylight use.
- **High Contrast** — Accessibility-first, WCAG AA+.

Themes are defined as Tailwind CSS config extensions. All component code uses semantic color tokens (`text-primary`, `bg-surface`, `border-subtle`) never raw hex values.

### 7.3 PDF Viewer Implementation

The PDF viewer uses `pdfjs-dist` rendered to HTML Canvas with an invisible SVG/HTML text layer overlaid for selection.

**Key implementation decisions:**

- Each page is rendered lazily (intersection observer). Only the visible page ± 1 page ahead is rendered to canvas at any time.
- The text layer uses absolute-positioned `<span>` elements matching pdfjs's extracted character positions. This gives native browser text selection, which is relayed to the React state via `document.getSelection()`.
- Zoom is handled by re-rendering at `devicePixelRatio * zoom` scale. Annotation positions are stored as PDF-space coordinates (0-1 normalized) and transformed on render.
- Page scrolling is virtualized to handle 200+ page papers without DOM bloat.

### 7.4 Selection → AI Action Flow

When a user selects text in the PDF viewer:

1. `TextSelectionOverlay` detects `mouseup` event, reads `window.getSelection()`.
2. Selection text + bounding rect are stored in `pdfStore.selection`.
3. A floating action toolbar appears near the selection with options:
   - `MessageSquare` — Ask about this
   - `FileText` — Summarize this
   - `Sigma` — Extract equations from this
   - `Highlighter` — Highlight (color picker)
   - `NotebookPen` — Add as margin note
   - `Copy` — Copy text
4. Choosing an AI action sends the selected text + page number to the chat panel with a pre-filled question.
5. The chat panel sends the selection as `context_override` to the RAG endpoint, bypassing the full vector search.

---

## 8. Feature Specifications

### 8.1 PDF Viewer & Workspace

**Description:** The primary canvas where users read papers. Everything else is a companion to this view.

**Functional Requirements:**

- FR-PDF-01: Open PDF files via drag-and-drop onto the app window, File > Open, or from the library panel.
- FR-PDF-02: Render all pages with correct fonts, images, and vector graphics.
- FR-PDF-03: Smooth continuous scroll or single-page view mode (toggle in status bar).
- FR-PDF-04: Zoom: fit-to-width, fit-to-page, and manual zoom (10%–400%).
- FR-PDF-05: Page jump via input field in status bar.
- FR-PDF-06: Native text selection across the text layer. Multi-line and multi-column selection supported.
- FR-PDF-07: Table of contents parsed from PDF bookmarks and displayed in sidebar; clicking jumps to section.
- FR-PDF-08: Page thumbnails panel (collapsible, left sidebar) with reading heatmap overlay (described in 8.8).
- FR-PDF-09: Keyboard shortcuts: `J`/`K` or arrow keys for page navigation; `Ctrl+F` for in-paper text search; `Ctrl+G` for page jump.
- FR-PDF-10: In-document full-text search with highlighted results and next/prev navigation.

**Non-Functional Requirements:**

- NFR-PDF-01: First page must render within 500ms of file open on a modern machine.
- NFR-PDF-02: Scrolling must maintain 60fps; no jank from background AI processing.
- NFR-PDF-03: Papers with up to 500 pages must remain responsive.

---

### 8.2 Reading Modes & QA Engine (RAG)

**Description:** The chat panel is the primary AI interaction surface. Rather than a generic chatbox, it operates in one of four Reading Modes that define how the AI participates in the conversation. All modes use the same RAG backend; the difference is in the system prompt, the response structure, and the UI affordances around each answer.

**Reading Modes:**

| Mode | Icon | What the AI does |
|---|---|---|
| **Explain** | `MessageSquare` | Default. Answers questions about the paper directly. Grounded, cited, neutral. |
| **Challenge** | `Swords` | Plays critical reader. For every answer, also surfaces one weakness, limitation, or counterargument found *within the paper itself* (e.g., from the limitations section or hedged claims). |
| **Connect** | `GitMerge` | Socratic mode. After answering, the AI asks the user a follow-up question to prompt active recall or deeper thinking. Designed to resist passive consumption. |
| **Annotate** | `PenLine` | Every AI response is automatically drafted as an annotation on the relevant page. The user can edit and keep it, or discard. Bridges reading and note-taking. |

The active mode is shown as a pill badge in the chat input bar. Mode can be changed mid-conversation; the mode applies to the next message onward only.

**Functional Requirements:**

- FR-QA-01: A chat input at the bottom of the right panel accepts free-form questions.
- FR-QA-02: A `ReadingModeSelector` component (four icon buttons with labels) sits above the chat input. The selected mode is persisted per paper session.
- FR-QA-03: On first question for a new paper, trigger the parsing + indexing pipeline in the background with a non-blocking progress indicator.
- FR-QA-04: Display the LLM's answer with inline source citations. Each citation shows: page number, section name, and a short excerpt of the matched chunk.
- FR-QA-05: Clicking a source citation jumps the PDF viewer to that page and briefly highlights the relevant region.
- FR-QA-06: Each answer displays a confidence indicator (`low` / `medium` / `high`) based on the similarity score of the top retrieved chunks.
- FR-QA-07: Conversation history is maintained per paper per session. User can clear it.
- FR-QA-08: Multi-turn conversations are supported. Full history is sent to the LLM on each turn.
- FR-QA-09: A "Sources" toggle collapses/expands the source citation cards below each answer.
- FR-QA-10: "Copy answer" and "Copy with sources" buttons on each response.

**Mode-Specific Behaviour:**

- **Challenge mode:** After the main answer, a visually distinct "Counterpoint" block appears with a `AlertTriangle` icon, containing the AI-sourced criticism. If no meaningful counterpoint exists in the paper, this block is omitted rather than fabricated.
- **Connect mode:** After the main answer, a "Your turn" block appears with a follow-up question rendered in a different background. The user can dismiss it or answer it (answer becomes the next user message).
- **Annotate mode:** The response generates a draft annotation object immediately. A preview of the annotation card appears below the answer with "Save annotation" and "Discard" buttons. On save, the annotation is written to SQLite and appears in the MarginaliaLayer.

**Edge Cases:**

- If the model returns an answer not grounded in retrieved chunks, display a "This may not be from the paper" warning banner.
- If the paper fails to parse (scanned image-only PDF), display an actionable error with a clear explanation. OCR support is in the backlog.

---

### 8.3 Selection-Based QA

**Description:** Ask questions about a specific highlighted region of the paper, using only that text as context (with optional fallback to full paper).

**Functional Requirements:**

- FR-SEL-01: When text is selected, a floating toolbar appears (described in 7.4).
- FR-SEL-02: Choosing "Ask about this" opens the chat panel (if not open) and creates a message prefilled with the selected text formatted as a blockquote.
- FR-SEL-03: The selected text is sent as `context_override` to the QA endpoint, bypassing the vector search entirely. The LLM only sees the selected text as context.
- FR-SEL-04: If the selected text is under 50 characters, the system falls back to full-paper RAG with the selection text appended to the question.
- FR-SEL-05: The chat panel visually distinguishes "selection-based" answers from "full-paper" answers with a small label.
- FR-SEL-06: The original selection remains visually indicated (soft highlight) in the viewer while the question is being answered.

---

### 8.4 Marginalia Engine ★

**Description:** The primary differentiating feature. After a paper is indexed, Queriously generates a set of AI-written notes that appear directly in the margins of the reading view — not in a sidebar, not in a chat panel, but alongside the text they refer to. This restores the physical habit of margin annotation to digital reading, with an AI that notices things a human reader might miss on a first pass.

This is distinct from user annotations (Section 8.9). Marginalia are AI-generated, produced automatically on ingest, and serve as a reading guide. User annotations are manually created and serve as personal notes.

**Margin Note Types:**

| Type | Label colour | What it flags |
|---|---|---|
| **Restatement** | Gray | Dense or jargon-heavy claim restated in plain language. |
| **Assumption** | Amber | A claim the paper makes without proof or citation — an axiom the argument rests on. |
| **Contradiction** | Red | A claim on this page that conflicts with a claim elsewhere in the paper. Shows the conflicting page reference. |
| **Connection** | Blue | A concept here that relates to another concept introduced elsewhere in the paper. |
| **Limitation** | Orange | A hedged claim, a scope restriction, or an acknowledged weakness. |

**Functional Requirements — Generation:**

- FR-MAR-01: Marginalia generation is triggered automatically after paper indexing completes. It runs as a background job. The user can begin reading immediately; notes appear progressively as pages are processed.
- FR-MAR-02: Generation processes the paper in page-order batches of 3 pages. Each batch is sent to the LLM with a structured prompt that instructs it to output JSON: `[{ type, page, paragraph_index, note_text, ref_page? }]`.
- FR-MAR-03: The LLM is explicitly instructed to produce notes only when genuinely warranted — not one per paragraph. Quality over quantity. An average paper should produce 15–40 margin notes total.
- FR-MAR-04: Contradiction detection is a second-pass operation. After all pages are processed, the system runs a dedicated prompt that searches for intra-paper contradictions by comparing the extracted claims list.
- FR-MAR-05: Generated notes are stored in SQLite (`marginalia` table) linked to `paper_id`, `page`, and `paragraph_index`. They are never re-generated unless the user explicitly requests it.
- FR-MAR-06: A "Regenerate marginalia" option in the paper menu discards all existing notes and re-runs generation.

**Functional Requirements — Display:**

- FR-MAR-07: Margin notes are rendered in the right gutter of the PDF viewer canvas, vertically aligned with the paragraph they reference. They do not overlay the paper text.
- FR-MAR-08: Each margin note is rendered as a compact pill: `[type badge] [first 60 chars of note]`. Hovering expands to full note text in a popover.
- FR-MAR-09: Contradiction and Connection notes that reference another page include a clickable page link that jumps the viewer to that page.
- FR-MAR-10: A toggle in the toolbar ("Marginalia on/off") hides all margin notes without deleting them.
- FR-MAR-11: A filter dropdown allows showing only specific note types (e.g., "show only Contradictions").
- FR-MAR-12: Users can edit any margin note by clicking on it and typing. Edited notes are flagged with a `Pencil` icon to distinguish them from unmodified AI-generated notes.
- FR-MAR-13: Users can delete individual margin notes. Deleted notes are soft-deleted (retained in DB with `is_deleted = true`) so regeneration remains idempotent.
- FR-MAR-14: Users can promote a margin note to a personal annotation using a "Keep as my note" button, which copies it to the annotations table with the user's chosen highlight colour.
- FR-MAR-15: The sidebar's annotations panel shows AI marginalia and user annotations in separate tabs.

**Non-Functional Requirements:**

- NFR-MAR-01: Marginalia generation for a 20-page paper should complete within 3 minutes on a local 7B model.
- NFR-MAR-02: Margin notes must not affect PDF viewer scroll performance. They are rendered as absolute-positioned DOM elements outside the canvas, not painted onto it.

---

### 8.5 Research Sessions ★

**Description:** A Research Session is a named, intentional workspace for a specific research question or investigation. It replaces generic "open papers in tabs" multi-paper mode with something that has purpose and produces a deliverable: a synthesis of what you've learned.

A session is the answer to: *"I'm reading papers to understand X. After reading five of them, what do I actually know about X so far?"*

**Session Components:**

- **Research question** — A free-text statement of what the session is investigating. Written by the user. Shown at the top of the session panel.
- **Paper set** — The papers added to this session. A paper can belong to multiple sessions.
- **Session annotations** — Annotations made while working in this session are tagged with the session ID, separate from standalone annotations.
- **Conversation history** — Chat messages from all papers within this session are collected in a unified view, filterable by paper.
- **Synthesis** — An auto-generated document that answers the research question based on all papers in the session. Updated on demand.

**Functional Requirements — Session Management:**

- FR-SES-01: Sessions panel accessible from the sidebar with a `FolderKanban` icon.
- FR-SES-02: "New Session" button opens a modal: session name input + research question textarea. Both required.
- FR-SES-03: Papers are added to a session from: (a) the library panel "Add to session" context menu, or (b) a "Add current paper to session" button in the tab bar when a session is active.
- FR-SES-04: The active session is shown as a persistent banner at the top of the reading view when a paper in the session is open. The banner shows the session name and research question (truncated). A `X` button exits session context (returns to standalone mode, does not delete the session).
- FR-SES-05: Session list shows: name, research question (truncated), paper count, last updated timestamp.
- FR-SES-06: Sessions are stored in SQLite. Deleting a session does not delete papers or standalone annotations.

**Functional Requirements — Cross-Paper Chat:**

- FR-SES-07: When a session is active, the chat panel gains a "Session context" toggle. When on, questions are answered using chunks retrieved from all papers in the session (multi-paper RAG), not just the currently open paper.
- FR-SES-08: In session context mode, source citations identify which paper each chunk came from: `[Paper title, p.X]`.
- FR-SES-09: The Reading Mode selector (Section 8.2) works in session context mode. Challenge and Connect modes are particularly useful here for cross-paper synthesis.

**Functional Requirements — Session Synthesis:**

- FR-SES-10: A "Generate Synthesis" button in the Session panel triggers synthesis generation.
- FR-SES-11: The synthesis pipeline: retrieve top-k chunks from all papers in the session → rank by relevance to research question → construct a structured synthesis prompt → stream the result.
- FR-SES-12: Synthesis output format:
  ```
  ## Research Question
  [User's stated question]

  ## What the literature agrees on
  [Bullet points with paper references]

  ## Key disagreements or open questions
  [Bullet points with paper references]

  ## Methodological patterns
  [Short prose]

  ## Gaps not covered by these papers
  [Bullet points]

  ## Suggested next steps
  [Bullet points]
  ```
- FR-SES-13: Each synthesis section is individually copyable. A "Copy full synthesis" button exports the whole document as Markdown.
- FR-SES-14: Synthesis is cached. A timestamp and "Regenerate" button are shown. Adding a new paper to the session marks the synthesis as stale with a visual indicator.
- FR-SES-15: Synthesis is included in the Export Pack for the session.

---

### 8.6 Equation Extraction & Plotting

**Description:** Surface all mathematical content from the paper. Render equations inline. Allow users to plot functions.

**Functional Requirements:**

**Extraction:**

- FR-EQ-01: After paper parsing, the Equations tab populates with all detected mathematical expressions, grouped by page.
- FR-EQ-02: Each equation entry shows: its page number, surrounding context sentence, and rendered KaTeX display.
- FR-EQ-03: Detection covers: `$$...$$` (display math), `$...$` (inline math), `\begin{equation}...\end{equation}`, and `\begin{align}...\end{align}` environments.
- FR-EQ-04: Equations that failed to parse (malformed LaTeX) are shown with a warning icon and the raw LaTeX.

**Rendering:**

- FR-EQ-05: All equations are rendered using KaTeX in the browser. No server round-trip needed for rendering.
- FR-EQ-06: Clicking an equation in the list jumps the PDF viewer to its page.

**Plotting:**

- FR-EQ-07: Equations that are detected as single-variable functions (e.g., `f(x) = ...`) show a `TrendingUp` (Lucide) "Plot this" button.
- FR-EQ-08: Clicking "Plot this" sends the LaTeX to the Python backend, which: parses with `latex2sympy2` → converts to `sympy` expression → evaluates over a range → renders with `matplotlib` → returns as base64 PNG.
- FR-EQ-09: The plot is displayed in a modal overlay with controls: variable range input, resolution slider, and a "Download PNG" button.
- FR-EQ-10: Multi-variable equations show a parameter sweep UI where the user can fix one variable and sweep another.
- FR-EQ-11: If `latex2sympy2` fails to parse the equation, display an error with the raw LaTeX and a link to Wolfram Alpha pre-filled with the expression.

---

### 8.7 Summarization Engine

**Description:** Generate summaries at multiple granularities: full paper, section, or selected text. Trimmed to three modes — "Abstract" and "Methods only" are omitted because they're trivially requested via chat.

**Functional Requirements:**

- FR-SUM-01: A "Summarize" button in the right panel toolbar triggers a paper-level summary.
- FR-SUM-02: Summary modes (selectable before generating):
  - **Bullet points** — 7–10 key findings and contributions.
  - **Critical review** — Structured critique: strengths, weaknesses, methodology notes, open questions raised but not answered.
  - **ELI5** — Explain this paper to a smart non-expert in plain language.
- FR-SUM-03: Section-level summarization: right-click on a TOC entry → "Summarize section".
- FR-SUM-04: Selection-level summarization: triggered from the floating toolbar.
- FR-SUM-05: Generated summaries are saved and persist across sessions (cached per paper + mode).
- FR-SUM-06: A "Regenerate" button produces a fresh summary (bypasses cache).
- FR-SUM-07: Summaries are copyable as plain text or Markdown.
- FR-SUM-08: The Summary tab shows a history of all generated summaries for the current paper with timestamps.

---

### 8.8 Citation & Reference Tracker

**Description:** Parse the paper's bibliography and allow users to follow citation threads. Intentionally minimal — this is a reading aid, not a reference manager.

**Functional Requirements:**

- FR-CIT-01: After parsing, the Citations tab populates with all detected references from the bibliography section.
- FR-CIT-02: Each reference entry shows: authors, title, year, venue, and — if resolved — a DOI or arXiv link.
- FR-CIT-03: DOI resolution uses the CrossRef API (requires internet). Failures fall back to displaying the raw reference text.
- FR-CIT-04: arXiv links are detected via regex and rendered as direct links.
- FR-CIT-05: "Open in Browser" button opens the DOI or arXiv URL in the system's default browser.
- FR-CIT-06: References that are already in the user's local library are marked with a `BookOpen` icon.
- FR-CIT-07: In-text citation markers (e.g., `[12]`, `(Smith et al., 2021)`) are clickable in the PDF viewer's text layer, jumping to the corresponding reference in the Citations tab.
- FR-CIT-08: Export all references as BibTeX or plain text.

---

### 8.9 Reading Progress & Annotations

**Description:** Track which parts of the paper have been read. Allow persistent highlights and user notes. Marginalia (AI-generated) lives in Section 8.4; this section covers user-authored annotations only.

**Functional Requirements — Reading Progress:**

- FR-PROG-01: Time-on-page is tracked silently using a visibility/focus observer. Pages that are visible and the window is focused increment a "read time" counter.
- FR-PROG-02: Page thumbnails show a reading heatmap: cold (unseen) → warm (briefly viewed) → hot (extended reading time). Subtle colour gradient, not intrusive.
- FR-PROG-03: A reading progress bar shows what percentage of pages have been "read" (≥ 30 seconds of view time).
- FR-PROG-04: Progress data is stored in SQLite and persists across app restarts.

**Functional Requirements — Annotations:**

- FR-ANN-01: User can highlight text using the selection toolbar. Five preset colours: yellow, green, blue, pink, orange.
- FR-ANN-02: User can add a text note to any highlight by clicking on it and typing.
- FR-ANN-03: User can add a standalone sticky note to any position on a page (click + hold).
- FR-ANN-04: Annotations panel in sidebar lists all user highlights and notes in two tabs: "Mine" and "AI" (marginalia). Sorted by page.
- FR-ANN-05: Clicking an annotation in the sidebar scrolls to and briefly pulses the annotation in the viewer.
- FR-ANN-06: Annotations are stored in SQLite as `{id, paper_id, session_id?, page, pdf_coords, type, color, text, note, created_at}`. `session_id` is populated when the annotation is created while a session is active.
- FR-ANN-07: Annotations are linked to the PDF by SHA-256 hash of the file content, not the file path. Moving a file does not break annotations.
- FR-ANN-08: Bulk export: annotations → Markdown, CSV, or JSON.

---

### 8.10 Library

**Description:** A minimal local library of opened papers. Queriously is not a reference manager. The library is a recency-sorted list of papers you've worked with, with enough metadata to find what you need.

**Functional Requirements:**

- FR-LIB-01: Library panel (sidebar) shows all papers opened in Queriously, sorted by last opened descending. List view only.
- FR-LIB-02: Each library entry shows: title (or filename if not parseable), authors, year, read progress indicator, and indexing status badge.
- FR-LIB-03: Multiple papers can be open simultaneously in tabs (tab bar at top).
- FR-LIB-04: Library search by title or author. No tag system.
- FR-LIB-05: "Remove from library" removes the paper from the library list and optionally deletes cached vectors and annotations (confirmation dialog with explicit opt-in checkboxes for each).
- FR-LIB-06: Papers are linked by SHA-256 hash. If the file is moved or renamed, Queriously detects the broken path on next open and prompts to relocate the file. Annotations and vectors are preserved.

---

## 9. Data Models

### SQLite Schema

```sql
-- Papers: core metadata for every paper in the library
CREATE TABLE papers (
    id              TEXT PRIMARY KEY,  -- SHA-256 of file content
    file_path       TEXT NOT NULL,
    title           TEXT,
    authors         TEXT,              -- JSON array
    abstract        TEXT,
    year            INTEGER,
    venue           TEXT,
    doi             TEXT,
    arxiv_id        TEXT,
    page_count      INTEGER,
    date_added      INTEGER NOT NULL,  -- Unix timestamp
    last_opened     INTEGER,
    is_indexed      BOOLEAN DEFAULT FALSE,
    index_version   INTEGER DEFAULT 0,
    marginalia_done BOOLEAN DEFAULT FALSE
);

-- Reading progress
CREATE TABLE reading_progress (
    paper_id        TEXT REFERENCES papers(id) ON DELETE CASCADE,
    page_number     INTEGER NOT NULL,
    time_spent_secs INTEGER DEFAULT 0,
    last_visited    INTEGER,
    PRIMARY KEY (paper_id, page_number)
);

-- User annotations (highlights + sticky notes)
CREATE TABLE annotations (
    id            TEXT PRIMARY KEY,
    paper_id      TEXT REFERENCES papers(id) ON DELETE CASCADE,
    session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    page          INTEGER NOT NULL,
    coords        TEXT NOT NULL,       -- JSON: [x1, y1, x2, y2] in PDF-space normalized coords
    type          TEXT NOT NULL,       -- 'highlight' | 'sticky'
    color         TEXT,
    selected_text TEXT,
    note_text     TEXT,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER
);

-- AI-generated marginalia
CREATE TABLE marginalia (
    id              TEXT PRIMARY KEY,
    paper_id        TEXT REFERENCES papers(id) ON DELETE CASCADE,
    page            INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,  -- 0-based index of paragraph on page
    type            TEXT NOT NULL,     -- 'restatement' | 'assumption' | 'contradiction' | 'connection' | 'limitation'
    note_text       TEXT NOT NULL,
    ref_page        INTEGER,           -- For contradiction/connection notes, the other page referenced
    is_edited       BOOLEAN DEFAULT FALSE,
    is_deleted      BOOLEAN DEFAULT FALSE,
    edited_text     TEXT,              -- User's edited version (if is_edited)
    generated_at    INTEGER NOT NULL
);

-- Research sessions
CREATE TABLE sessions (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    research_question TEXT NOT NULL,
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER,
    synthesis_text   TEXT,             -- Cached synthesis Markdown
    synthesis_stale  BOOLEAN DEFAULT FALSE,
    synthesis_at     INTEGER
);

-- Papers belonging to a session
CREATE TABLE session_papers (
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    paper_id   TEXT REFERENCES papers(id) ON DELETE CASCADE,
    added_at   INTEGER NOT NULL,
    PRIMARY KEY (session_id, paper_id)
);

-- Chat sessions (per-paper or per-research-session)
CREATE TABLE chat_sessions (
    id              TEXT PRIMARY KEY,
    paper_id        TEXT REFERENCES papers(id) ON DELETE CASCADE,
    research_session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    created_at      INTEGER NOT NULL,
    is_multi_paper  BOOLEAN DEFAULT FALSE
);

CREATE TABLE chat_messages (
    id             TEXT PRIMARY KEY,
    chat_session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role           TEXT NOT NULL,       -- 'user' | 'assistant'
    content        TEXT NOT NULL,
    sources        TEXT,                -- JSON: [{paper_id, page, section, excerpt, score}]
    reading_mode   TEXT,                -- 'explain' | 'challenge' | 'connect' | 'annotate'
    selection_text TEXT,
    confidence     TEXT,                -- 'low' | 'medium' | 'high'
    created_at     INTEGER NOT NULL
);

-- Summaries cache
CREATE TABLE summaries (
    id         TEXT PRIMARY KEY,
    paper_id   TEXT REFERENCES papers(id) ON DELETE CASCADE,
    mode       TEXT NOT NULL,           -- 'bullets' | 'critique' | 'eli5'
    scope      TEXT NOT NULL,           -- 'full' | 'section:{name}' | 'selection'
    content    TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    is_cached  BOOLEAN DEFAULT TRUE
);
```

### Pydantic Models (Python Sidecar)

```python
class IngestRequest(BaseModel):
    paper_id: str
    file_path: str

class IngestResponse(BaseModel):
    paper_id: str
    chunk_count: int
    equation_count: int
    citation_count: int
    metadata: PaperMetadata

class QARequest(BaseModel):
    question: str
    paper_id: str
    chat_session_id: str
    reading_mode: Literal["explain", "challenge", "connect", "annotate"]
    context_paper_ids: list[str] = []   # populated when session context is on
    context_override: str | None = None  # selection-based QA
    top_k: int = 5

class QAChunk(BaseModel):
    paper_id: str
    page: int
    section: str | None
    text: str
    score: float

class QAResponse(BaseModel):
    answer: str
    counterpoint: str | None           # Challenge mode only
    followup_question: str | None      # Connect mode only
    draft_annotation: DraftAnnotation | None  # Annotate mode only
    sources: list[QAChunk]
    confidence: Literal["low", "medium", "high"]

class DraftAnnotation(BaseModel):
    paper_id: str
    page: int
    selected_text: str
    note_text: str

class MarginaliaRequest(BaseModel):
    paper_id: str
    pages: list[int]                   # Batch of page numbers to process

class MarginaliaNote(BaseModel):
    page: int
    paragraph_index: int
    type: Literal["restatement", "assumption", "contradiction", "connection", "limitation"]
    note_text: str
    ref_page: int | None

class MarginaliaResponse(BaseModel):
    paper_id: str
    notes: list[MarginaliaNote]

class SessionSynthesisRequest(BaseModel):
    session_id: str
    research_question: str
    paper_ids: list[str]
    top_k_per_paper: int = 8

class SummarizeRequest(BaseModel):
    paper_id: str
    mode: Literal["bullets", "critique", "eli5"]
    scope: str                         # "full" | "section:{name}" | "selection"
    content: str | None                # required for 'selection' scope

class EquationPlotRequest(BaseModel):
    latex: str
    variable: str = "x"
    x_min: float = -10.0
    x_max: float = 10.0
    resolution: int = 500
```

---

## 10. API Contract (IPC / Python RPC)

### Tauri Commands (React → Rust)

All invocable from React using `import { invoke } from '@tauri-apps/api/core'`.

| Command | Input | Output | Description |
|---|---|---|---|
| `open_pdf` | `{ path: string }` | `PaperMeta` | Open file, add to library, trigger background indexing + marginalia |
| `get_library` | `{}` | `Paper[]` | All papers, sorted by last opened |
| `delete_paper` | `{ paper_id: string, delete_vectors: boolean, delete_annotations: boolean }` | `void` | Remove from library with optional cascade |
| `get_annotations` | `{ paper_id: string }` | `Annotation[]` | User annotations for paper |
| `save_annotation` | `Annotation` | `Annotation` | Create or update user annotation |
| `delete_annotation` | `{ id: string }` | `void` | Delete annotation |
| `get_marginalia` | `{ paper_id: string }` | `MarginaliaNote[]` | All margin notes for paper |
| `update_marginalia_note` | `{ id: string, edited_text: string }` | `void` | Save user edit to a margin note |
| `delete_marginalia_note` | `{ id: string }` | `void` | Soft-delete a margin note |
| `promote_marginalia_to_annotation` | `{ marginalia_id: string, color: string }` | `Annotation` | Copy note to user annotations |
| `update_reading_progress` | `{ paper_id: string, page: number, delta_secs: number }` | `void` | Increment page view time |
| `get_sessions` | `{}` | `Session[]` | All research sessions |
| `create_session` | `{ name: string, research_question: string }` | `Session` | Create new session |
| `add_paper_to_session` | `{ session_id: string, paper_id: string }` | `void` | Link paper to session |
| `remove_paper_from_session` | `{ session_id: string, paper_id: string }` | `void` | Unlink paper |
| `delete_session` | `{ session_id: string }` | `void` | Delete session (papers unaffected) |
| `get_chat_session` | `{ paper_id: string, research_session_id?: string }` | `ChatSession` | Get or create chat session |
| `export_pack` | `{ paper_id?: string, session_id?: string, format: string, include_annotations: boolean, include_chat: boolean, include_marginalia: boolean, include_synthesis: boolean }` | `string` | Generate export, return output path |

### Python Sidecar Endpoints (Rust → Python via HTTP)

| Endpoint | Method | Description |
|---|---|---|
| `/ingest` | POST | Parse and index a PDF |
| `/ingest/status/{paper_id}` | GET | Get indexing progress |
| `/qa` | POST | Ask a question in a reading mode (streaming SSE) |
| `/marginalia/generate` | POST | Generate margin notes for a batch of pages (streaming SSE) |
| `/marginalia/{paper_id}` | GET | Retrieve all stored margin notes for a paper |
| `/sessions/synthesize` | POST | Generate session synthesis (streaming SSE) |
| `/summarize` | POST | Generate summary (streaming SSE) |
| `/equations/{paper_id}` | GET | List extracted equations |
| `/equations/plot` | POST | Generate a function plot, returns base64 PNG |
| `/citations/{paper_id}` | GET | List extracted references |
| `/citations/resolve` | POST | Enrich a reference via CrossRef |
| `/health` | GET | Sidecar health check |

### Tauri Events (Rust → React, push)

| Event | Payload | Description |
|---|---|---|
| `ingest:progress` | `{ paper_id, step, percent }` | Indexing progress |
| `ingest:complete` | `{ paper_id, result }` | Indexing finished |
| `marginalia:note` | `{ paper_id, note: MarginaliaNote }` | Single note ready (streamed progressively) |
| `marginalia:complete` | `{ paper_id, total_count }` | All margin notes generated |
| `ai:token` | `{ chat_session_id, token }` | Streaming LLM token |
| `ai:done` | `{ chat_session_id, full_response }` | LLM response complete |
| `ai:error` | `{ chat_session_id, error }` | LLM error |
| `synthesis:token` | `{ session_id, token }` | Streaming synthesis token |
| `synthesis:done` | `{ session_id }` | Synthesis complete |
| `sidecar:status` | `{ status: 'starting' \| 'ready' \| 'error' }` | Sidecar lifecycle |

---

## 11. UI/UX Specification

### Design Tokens

```typescript
// tailwind.config.ts extensions
colors: {
  // Queriously Dark (default)
  surface: {
    base: '#0F1117',      // App background
    raised: '#1A1D27',    // Panels, cards
    overlay: '#22263A',   // Modals, popovers
    border: '#2E3250',    // Dividers
  },
  text: {
    primary: '#E8EAF2',
    secondary: '#8B92B4',
    muted: '#4E5578',
    accent: '#F0A500',    // Amber — primary actions
  },
  accent: {
    primary: '#F0A500',   // Amber
    secondary: '#6C7AE0', // Indigo
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
  },
  annotation: {
    yellow: '#FEF08A',
    green: '#BBF7D0',
    blue: '#BAE6FD',
    pink: '#FBCFE8',
    orange: '#FED7AA',
  }
}
```

### Typography

- **UI font:** Inter (loaded from bundled assets, no network request)
- **Monospace:** JetBrains Mono (for code blocks in answers, LaTeX raw strings)
- **Base size:** 14px (comfortable for long-form reading panel)
- **PDF renders** at whatever resolution the PDF was authored

### Icon Usage (Lucide)

Key icons used throughout the UI:

| Context | Icon |
|---|---|
| Open file | `FolderOpen` |
| Library | `Library` |
| Chat / Ask | `MessageSquare` |
| Reading mode: Challenge | `Swords` |
| Reading mode: Connect | `GitMerge` |
| Reading mode: Annotate | `PenLine` |
| Summarize | `FileText` |
| Equations | `Sigma` |
| Citations | `Quote` |
| Annotations / Highlight | `Highlighter` |
| Add as margin note | `NotebookPen` |
| Marginalia: assumption | `AlertTriangle` |
| Marginalia: contradiction | `ShieldAlert` |
| Marginalia: connection | `Link2` |
| Marginalia: limitation | `Info` |
| Marginalia: restatement | `MessageCircle` |
| Marginalia toggle | `Eye` / `EyeOff` |
| Research sessions | `FolderKanban` |
| Session synthesis | `Sparkles` |
| Active session banner | `FlaskConical` |
| Reading progress | `BookOpen` |
| Settings | `Settings2` |
| Export | `Download` |
| Plot function | `TrendingUp` |
| Confidence low | `AlertCircle` |
| Confidence high | `CheckCircle2` |
| Source citation jump | `MapPin` |
| AI-edited note | `Pencil` |
| Promote to annotation | `Bookmark` |

### Key Interaction Patterns

**Floating Selection Toolbar:** Appears 8px above the selection bounding box. Fades in over 120ms. Auto-dismisses on click-away or Escape. Six icon-only buttons with tooltips: Ask, Summarize, Extract equations, Highlight, Add as margin note, Copy.

**Reading Mode Selector:** Four icon buttons in a compact row above the chat input. Active mode shown with an amber underline. Switching mode mid-conversation shows a subtle divider in the chat history: `— Switched to Challenge mode —`.

**Challenge Mode Counterpoint Block:** Rendered below the main answer with a distinct amber-left-border card, `ShieldAlert` icon, and label "From the paper's own limitations." Only shown when the model found genuine grounding for a counterpoint.

**Connect Mode Follow-up Block:** Rendered below the answer with a `GitMerge` icon and label "Your turn." Styled in a slightly indented, muted-background card. Dismiss button (×) in top right.

**Annotate Mode Draft Card:** Rendered below the answer as a preview annotation card with a dashed border. Shows the page number, a colour picker chip, and "Save annotation" / "Discard" buttons. On save, the annotation appears in the viewer immediately.

**Marginalia Notes:** Rendered as absolute-positioned pills in the PDF viewer's right gutter, vertically aligned with their referenced paragraph. Each pill shows a coloured type badge and truncated note text. Hover expands to full note in a popover. The popover has Edit, Delete, and Promote-to-annotation action buttons. Notes appear progressively as generation completes — already-processed pages show notes immediately, pending pages show a subtle loading shimmer in the gutter.

**Session Banner:** A 36px-tall persistent strip across the top of the PDF viewer (below the tab bar) when a session is active. Shows `FlaskConical` icon, session name, and a truncated research question. A "Session context ON/OFF" toggle pill on the right side. Clicking the session name opens the Sessions panel.

**Chat Streaming:** Token-by-token text append with a blinking cursor. Source cards and mode-specific blocks (counterpoint, follow-up, draft annotation) fade in when the full response is complete.

**Indexing Progress:** Non-blocking. Shows as a subtle progress line below the paper's tab. After indexing completes, marginalia generation begins automatically and shows a secondary progress indicator: "Generating margin notes… (page 4/24)".

**Equation Cards:** Default collapsed to a single line (KaTeX rendered equation + first 60 chars of context). Expandable. "Plot" button visible only on hover, only for plottable single-variable functions.

### Onboarding Flow

On first launch, a 3-step modal:

1. **Welcome** — Product intro. Headline: *"Your papers, but alive."* Sub-headline: *"Queriously reads alongside you — generating margin notes, answering questions, and helping you think across papers. Local-first, your model, your data."*
2. **AI Setup** — Choose LLM provider:
   - **Local (Ollama)** — Show install instructions and model pull command (`ollama pull llama3.2`). Detect if Ollama is running and show a green checkmark.
   - **OpenAI** — API key input with link to platform.openai.com.
   - **Anthropic** — API key input with link to console.anthropic.com.
   - **Other** — Custom base URL + API key (any LiteLLM-compatible endpoint).
3. **Open a Paper** — Drag-and-drop zone or "Browse Files" button.

Settings can always be revisited via `Settings2` → AI Provider tab. The BYOK nature is surfaced here explicitly: *"Your API key is stored locally in the system keychain. It is never transmitted to Queriously's servers — there are none."*

---

## 12. Phased Delivery Plan

### Phase 1 — Core Reader (MVP)

**Goal:** A working local PDF reader with AI Q&A and basic marginalia. The two things that immediately distinguish Queriously from a PDF reader with ChatGPT pasted next to it.

**Scope:**

- Tauri app shell + Python sidecar bootstrapping (Ollama as default, onboarding flow)
- PDF viewer (pdfjs, continuous scroll, zoom, page jump, text selection)
- Paper ingestion pipeline (PyMuPDF, chunking, embedding, ChromaDB)
- Full-paper Q&A — Explain mode only (RAG, streaming, source citations with page jump)
- Selection-based Q&A (context override via floating toolbar)
- Marginalia Engine — generation pipeline + margin note display in PDF gutter. Types: Restatement, Assumption, Limitation only (Contradiction deferred to Phase 2 as it requires the second-pass claim comparison)
- Basic summarization (Bullets mode only)
- Library panel (flat recency list, open/close/remove papers)
- Reading progress tracking (time-on-page, heatmap in thumbnails)
- User highlights (no sticky notes yet)
- SQLite setup with all tables (schema complete even if not all features active)
- Queriously Dark theme

**Excluded from Phase 1:** Challenge/Connect/Annotate reading modes, Contradiction marginalia, Research Sessions, Equation plotting, Citations tab, Export Pack.

**Exit Criteria:** Open "Attention Is All You Need", see margin notes generate alongside the paper, ask 10 questions, receive grounded answers with page citations. The experience should feel meaningfully different from a chatbot.

---

### Phase 2 — Full Reading Intelligence

**Goal:** All four reading modes active. Contradiction detection in marginalia. Full annotation system. Everything a single-paper workflow needs.

**Scope:**

- Reading modes: Challenge, Connect, Annotate (completing the full set)
- Marginalia: Contradiction and Connection note types (second-pass claim comparison pipeline)
- Marginalia: Edit, delete, promote-to-annotation interactions
- User sticky notes
- Equation extraction + KaTeX rendering (Equations tab)
- Equation plotting (matplotlib, plot modal)
- Citation extraction + DOI/arXiv resolution (Citations tab)
- Summarization: Critique and ELI5 modes
- Section-level summarization (TOC right-click)
- Annotation export (Markdown, JSON)
- TOC sidebar from PDF bookmarks

**Exit Criteria:** A researcher can read a paper end-to-end, interact with margin notes, annotate freely, explore equations, and check references — all without leaving the app.

---

### Phase 3 — Research Sessions

**Goal:** Enable the literature review workflow. Multiple papers, one research question, a synthesis at the end.

**Scope:**

- Research Sessions — create, manage, add papers, active session banner
- Session context mode in Chat (multi-paper RAG across session papers)
- Session synthesis generation (structured Markdown output, streaming)
- Synthesis stale detection on paper add
- All reading modes work in session context
- Cross-paper source citations (paper title + page in source cards)
- Export Pack — per-paper and per-session (annotations + chat + marginalia + synthesis)
- BibTeX export from Citations tab

**Exit Criteria:** Create a session called "Transformer architecture variants", add 5 papers, ask "What are the main differences in attention mechanisms across these papers?" and receive a grounded cross-paper answer with citations from multiple papers.

---

### Phase 4 — Polish & Resilience

**Goal:** Production-quality. Ready for a wider launch. No rough edges.

**Scope:**

- Scholar Light theme
- Advanced LLM settings (temperature, system prompt customisation, model swap mid-session)
- Re-ranking support (cross-encoder for retrieval quality improvement)
- Broken file path recovery (detect moved PDFs, prompt to relocate)
- Performance audit: startup time, 200+ page papers, marginalia generation speed
- Accessibility audit: full keyboard navigation, screen reader support, WCAG AA
- Auto-update via Tauri updater
- OCR support for scanned PDFs (pytesseract or surya, Phase 4 backlog item from OQ-03)
- Windows support (resolve sidecar bundling on Windows, full test pass)

---

## 13. Tech Dependencies

### Frontend (npm)

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.3 | UI framework |
| `@tauri-apps/api` | ^2.x | IPC with Rust |
| `pdfjs-dist` | ^4.x | PDF rendering |
| `zustand` | ^4.x | State management |
| `katex` | ^0.16 | LaTeX inline rendering |
| `lucide-react` | ^0.400 | Icons |
| `tailwindcss` | ^3.x | Styling |
| `@radix-ui/react-*` | latest | Accessible UI primitives (popovers, tooltips, dialogs) |
| `react-resizable-panels` | latest | Resizable three-panel layout |
| `framer-motion` | ^11.x | Animations (marginalia fade-in, mode transitions) |
| `react-virtual` | ^3.x | PDF page virtualization |
| `react-markdown` | ^9.x | Rendering synthesis and summary Markdown output |

### Rust (Cargo)

| Crate | Purpose |
|---|---|
| `tauri` v2 | App framework |
| `rusqlite` | SQLite access |
| `serde` / `serde_json` | Serialization |
| `tokio` | Async runtime |
| `reqwest` | HTTP client (proxy to sidecar) |
| `sha2` | File hashing |

### Python (requirements.txt)

| Package | Purpose |
|---|---|
| `fastapi` + `uvicorn` | Sidecar HTTP server |
| `PyMuPDF` (fitz) | Primary PDF parsing + page layout analysis |
| `pdfplumber` | Table and column extraction |
| `sentence-transformers` | Local embeddings (all-MiniLM-L6-v2) |
| `chromadb` | Vector store with persistent local client |
| `litellm` | Unified LLM interface (Ollama, OpenAI, Anthropic, etc.) |
| `latex2sympy2` | LaTeX → sympy expression parsing |
| `sympy` | Symbolic math evaluation |
| `matplotlib` | Function plotting (headless, base64 PNG output) |
| `pydantic` v2 | Schema validation |
| `httpx` | Async HTTP client (CrossRef DOI resolution) |

---

## 14. Testing Strategy

### Unit Tests

- **Python:** `pytest` for all core modules. Every router endpoint tested with mock LLM responses. PDF parsing tested against a corpus of 10 test PDFs covering edge cases (scanned, 2-column, math-heavy, tables).
- **Rust:** `cargo test` for SQLite operations, file hashing, sidecar lifecycle management.
- **React:** `vitest` + `@testing-library/react` for component logic. All store reducers tested.

### Integration Tests

- End-to-end: Tauri `webdriver`-based tests that exercise the full IPC chain from React invoke to Python response.
- A dedicated set of "golden" test papers with known expected answers, used to regression-test the RAG pipeline.

### Performance Benchmarks

- Ingestion time for a 20-page paper: target < 30 seconds on an M-series Mac / modern x86 with CPU-only embeddings.
- First token latency for local Llama3.2 (3B): target < 3 seconds.
- PDF first render (page 1): target < 500ms.
- App cold start to interactive: target < 2 seconds.

### Accessibility

- All interactive elements must be keyboard-navigable.
- All icons used as interactive elements must have `aria-label`.
- Color alone must never be the sole indicator of state (annotations, confidence levels).
- WCAG AA contrast ratio minimum on all text.

---

## 15. Open Questions & Decisions Log

| # | Question | Status | Decision / Notes |
|---|---|---|---|
| OQ-01 | Should ChromaDB be embedded (in-process Python) or run as a separate persistent server? | **Decided** | Embedded in-process. Simpler, no port conflict. Persistent storage via ChromaDB's `PersistentClient`. |
| OQ-02 | PyInstaller vs. uv + system Python for sidecar bundling? | **Decided** | **PyInstaller.** Target users are researchers, not developers. Zero-dependency install experience is non-negotiable. uv requires Python on the host and bootstraps on first launch — too many failure points before the user has opened a single paper. Bundle size overhead (~80–120 MB) is acceptable for a desktop app. |
| OQ-03 | Should we support OCR for scanned PDFs in Phase 1? | **Decided** | No. Show a clear, actionable error. Backlogged to Phase 4. `pytesseract` or `surya` are the candidates. When OCR lands, equation extraction for image-only PDFs comes along with it naturally (see OQ-04). |
| OQ-04 | Should equation detection fall back to vision-based detection for PDFs where LaTeX is not embedded in the text layer? | **Decided** | **Deferred to Phase 4, tied to OCR work.** The correct implementation is a VLM call per page (screenshot → extract equations), but that makes equation extraction dependent on the LLM being configured and responsive — a bad dependency for a parsing step that should be deterministic. Solving it at the OCR layer is cleaner. |
| OQ-05 | What is the default chunking strategy? | **Decided** | Recursive character-based splitting with section-awareness. Chunk size 512 tokens, overlap 64. Revisit if retrieval quality is poor in testing. |
| OQ-06 | Do we need custom PDF text layer interaction for selection, or is native browser selection sufficient? | **Decided** | Native browser selection is sufficient for Phase 1. Custom region selection (for figures, non-text areas) is Phase 3 backlog. |
| OQ-07 | Where should the vector store live? | **Decided** | Default `~/.queriously/vectors/`. Exposed as a configurable path in Settings for power users who want Dropbox/iCloud sync. |
| OQ-08 | Should the app support Windows on Phase 1 ship, or macOS-first? | **Decided** | macOS-first for Phase 1. Windows support in Phase 4. Sidecar bundling on Windows (DLL dependencies, PATH issues) adds meaningful risk to the Phase 1 timeline. |
| OQ-09 | Citation parsing: regex heuristics vs. GROBID? | **Decided** | Regex for Phase 1 (fast, no infra). GROBID as an optional Phase 3 enhancement for higher accuracy on complex bibliography formats. |
| OQ-10 | How many margin notes is the right density for a 20-page paper? | **Decided** | **Target 15–30 notes for a 20-page paper.** Encode this directly in the generation prompt: *"aim for approximately one note per two substantive paragraphs, no more than 30 total for this batch."* Expected distribution by type: Restatements 8–12, Assumptions 3–5, Limitations 3–5, Connections 2–4, Contradictions 0–3. Add a minimum confidence threshold to the prompt — if the model is not confident enough to commit to a specific note type, emit nothing rather than forcing a note. |
| OQ-11 | Should marginalia generation block the user from asking questions, or can both run concurrently? | **Decided** | **Concurrent, with Q&A preempting marginalia in the LLM queue.** Ingestion must complete before Q&A can begin. Marginalia generation runs independently after ingestion on a single-worker queue per paper. If the user submits a Q&A request while marginalia generation is mid-batch, the Q&A job jumps the queue — marginalia resumes after the response is returned. This prevents a long generation job from adding latency to an interactive question. |
| OQ-12 | For Contradiction margin notes, should we detect contradictions only within a single paper, or also across papers in an active session? | **Decided** | **Single-paper contradictions in Phase 2. Cross-paper disagreement detection in Phase 3 as part of Session synthesis — not as individual margin notes.** Within a single paper, a contradiction is a genuine inconsistency (the author said X on page 3, Y on page 14). Across papers it is more accurately a *disagreement* — two papers making different claims, neither necessarily wrong. The distinction matters for how the note is framed. Cross-paper disagreements surface in the Session synthesis under the "Key disagreements" section, not as gutter notes on individual papers. |
| OQ-13 | Should the Session Synthesis update automatically when a new paper is added to the session, or only on explicit "Regenerate"? | **Decided** | **Explicit regenerate only, with a stale banner showing the count of papers added since the last generation.** Banner copy: *"3 papers added since this synthesis was generated — [Regenerate]."* The count conveys urgency — one new paper may not warrant regenerating, five almost certainly does. Auto-generation on every paper add would be slow, wasteful, and interrupt the reading flow. |
| OQ-14 | How should the API key be stored? Plaintext in a config file or system keychain? | **Decided** | **System keychain via Tauri's `keyring` crate. Never written to disk in plaintext.** Surfaced explicitly in onboarding: *"Your API key is stored in your system keychain. Queriously has no servers."* On Linux, `keyring` falls back to an encrypted file using a machine-derived key when no keyring daemon is running. This fallback is documented in Settings with a small info tooltip so users understand what they're getting. |
| OQ-15 | Should the `reading_mode` default be remembered globally or per-paper? | **Decided** | **Always default to Explain mode on every paper open — no stickiness.** Per-paper memory and global-with-override both create a risk of the user asking a question in Challenge or Connect mode by accident, having forgotten what they set previously. Explicit is better than sticky for a feature this consequential. The mode selector is prominent enough that switching is low friction. Reading mode state is therefore never persisted — it is UI-only and resets on each paper open. |

---

*End of specification — Queriously v1.2.0-draft*
