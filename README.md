<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="queriously-white-bg.png">
    <source media="(prefers-color-scheme: light)" srcset="queriously-red-bg.png">
    <img alt="Queriously Logo" src="queriously-red-bg.png" width="128">
  </picture>
</p>

<h1 align="center">Queriously</h1>

<p align="center">
  A local-first PDF reader for people who interrogate papers.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-0.1.0-blue" alt="Version 0.1.0" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License MIT" />
  <img src="https://img.shields.io/badge/Platform-macOS-lightgrey" alt="Platform macOS" />
</p>

Queriously is a research copilot built into the place where serious reading
actually happens: the PDF page.

It is not a chatbot with an upload button. It is a desktop reader that treats a
paper as structured source material. Pages become passages. Passages become
citations. Citations become an evidence trail you can inspect, challenge, and
reuse.

## Why it exists

Technical PDFs are dense in ways normal document tools do not understand. A
paper is not just text. It has claims, assumptions, figures, references,
definitions, contradictions, methods, and caveats hiding in appendices.

Queriously is built for the moment where you are halfway through a paper and
thinking:

- "What exactly is this claim relying on?"
- "Where did they justify that assumption?"
- "Does this contradict the result from section 4?"
- "Can I trust this answer, and where is the source passage?"

The answer should not float in an ungrounded chat window. It should stay tied to
the page.

## What it feels like

Open a technical PDF. Queriously indexes it locally, keeps the reader front and
center, and adds a research layer around the page:

- **Grounded Q&A**: ask questions and get answers with page-aware citations.
- **Reading modes**: switch between explanation, challenge, connection, and
  annotation workflows depending on how you want the copilot to participate.
- **Marginalia**: generate notes that live beside the page, not buried in a
  separate document.
- **Source trail**: inspect which passages produced an answer before trusting
  it.
- **Sessions**: keep a research thread alive across papers, notes, citations,
  and summaries.
- **Local-first memory**: library metadata, progress, highlights, notes, and
  sessions stay on your machine.

## The nerdy part

Queriously works because the PDF is converted into an addressable evidence
system before the model ever answers a question.

```text
PDF
  -> page text + layout extraction
  -> chunked passages with stable metadata
  -> local embeddings
  -> vector retrieval
  -> cited answer synthesis
  -> marginalia + session memory
```

The important bit is not just retrieval. It is provenance. Each answer is
supposed to carry a small audit trail: which page, which passage, which source
fragment, and how confident the assistant should be.

### Passage-first reading

Queriously breaks papers into chunks that preserve document context: page
number, surrounding text, source location, and session state. This gives the
assistant something more useful than a blob of extracted text. It can reason
over passages while still pointing back to the PDF.

### Reading modes

The same paper can be read in different ways. Queriously exposes that as modes:

- **Explain** turns dense sections into plain-language reasoning.
- **Challenge** looks for weak assumptions, missing controls, or overclaimed
  conclusions.
- **Connect** links the current passage to nearby ideas and prior session
  context.
- **Annotate** turns useful observations into notes attached to the reading
  workflow.

This is deliberately more opinionated than generic chat. The model is not just
"answering"; it is taking a role in the reading process.

### Marginalia engine

Marginalia is the product thesis in miniature. A smart reader does not only ask
questions after finishing the paper. They make marks while reading.

Queriously generates page-adjacent notes for things worth noticing: compressed
claims, assumptions, caveats, possible contradictions, and "come back to this"
moments. The goal is not to summarize the whole paper. The goal is to make the
next minute of reading sharper.

### Local-first architecture

The desktop app owns the reading experience. A Rust/Tauri shell handles the
native app boundary and local persistence. A Python sidecar handles the AI-heavy
work: parsing, chunking, embeddings, retrieval, summarization, and model calls.

This split keeps the UI fast while letting the research pipeline use the Python
ML ecosystem. It also means the app can support BYOK and local model workflows
without turning the reader into a hosted SaaS dependency.

### Evidence over vibes

Queriously is designed around one rule: the paper is the source of truth.

If the assistant says something useful, you should be able to jump to the
passage that made it say that. If the evidence is weak, the UI should make that
obvious. If the answer depends on a model provider, the user should control that
provider.

## Status

Queriously is early, useful, and moving quickly. The current macOS build already
supports local PDF reading, indexing, cited Q&A, marginalia, summaries, reading
progress, and the beginning of persistent research sessions.

The direction is simple: make technical reading feel less like searching a PDF
and more like working with an obsessive research partner who always shows their
sources.
