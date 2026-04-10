"""Paper ingestion pipeline — spec §6.3 steps 1-6.

POST /ingest  →  parse → chunk → embed → store in ChromaDB.
GET  /ingest/status/{paper_id}  →  progress polling.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks

from ..core.chunker import chunk_pages
from ..core.embedder import embed_texts
from ..core.pdf_parser import parse_pdf
from ..core.vector_store import upsert_chunks
from ..models.schemas import IngestRequest, IngestResponse, PaperMetadata

logger = logging.getLogger("queriously.ingest")

router = APIRouter(prefix="/ingest", tags=["ingest"])

# In-memory progress tracker. Fine for a single-user desktop sidecar; no need
# for Redis or a DB-backed queue.
_progress: dict[str, dict[str, Any]] = {}


@router.post("", response_model=IngestResponse)
async def ingest(req: IngestRequest, bg: BackgroundTasks) -> IngestResponse:
    """Synchronous fast path: parse and index inline (papers are small enough
    that the full pipeline finishes in seconds on modern hardware for typical
    20-page PDFs). If we ever need async, we can push to BackgroundTasks and
    have the frontend poll /ingest/status/{paper_id}."""

    paper_id = req.paper_id
    _progress[paper_id] = {"step": "parsing", "percent": 0}

    # --- Step 1–3: parse ---
    result = parse_pdf(req.file_path)
    _progress[paper_id] = {"step": "chunking", "percent": 20}

    # --- Step 4: chunk ---
    chunks = chunk_pages(result.pages)
    _progress[paper_id] = {"step": "embedding", "percent": 40}

    if not chunks:
        _progress[paper_id] = {"step": "done", "percent": 100}
        return IngestResponse(
            paper_id=paper_id,
            chunk_count=0,
            equation_count=len(result.equations),
            citation_count=0,
            metadata=PaperMetadata(
                title=result.title,
                authors=result.authors,
                abstract=result.abstract,
                year=result.year,
                page_count=result.page_count,
            ),
        )

    # --- Step 5: embed ---
    texts = [c.text for c in chunks]
    # Batch in groups of 128 to avoid OOM on very long papers.
    all_embeddings: list[list[float]] = []
    batch_size = 128
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        all_embeddings.extend(embed_texts(batch))
        pct = 40 + int(50 * min((i + batch_size), len(texts)) / len(texts))
        _progress[paper_id] = {"step": "embedding", "percent": pct}

    # --- Step 6: store ---
    _progress[paper_id] = {"step": "storing", "percent": 92}
    ids = [
        hashlib.md5(f"{paper_id}:{c.chunk_index}".encode()).hexdigest()
        for c in chunks
    ]
    metadatas = [
        {
            "page": c.page_number,
            "section": c.section_title or "",
            "chunk_index": c.chunk_index,
        }
        for c in chunks
    ]
    upsert_chunks(
        paper_id=paper_id,
        ids=ids,
        documents=texts,
        embeddings=all_embeddings,
        metadatas=metadatas,
    )

    _progress[paper_id] = {"step": "done", "percent": 100}
    logger.info("ingested %s — %d chunks, %d equations", paper_id[:12], len(chunks), len(result.equations))

    return IngestResponse(
        paper_id=paper_id,
        chunk_count=len(chunks),
        equation_count=len(result.equations),
        citation_count=0,  # citation extraction lands in Phase 2
        metadata=PaperMetadata(
            title=result.title,
            authors=result.authors,
            abstract=result.abstract,
            year=result.year,
            page_count=result.page_count,
        ),
    )


@router.get("/status/{paper_id}")
def ingest_status(paper_id: str) -> dict[str, Any]:
    return _progress.get(paper_id, {"step": "unknown", "percent": 0})
