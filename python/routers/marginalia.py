"""Marginalia generation endpoint — spec §8.4.

POST /marginalia/generate  →  streaming SSE of individual notes as they're
generated batch-by-batch (3 pages at a time).
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..core.marginalia_engine import generate_marginalia_batch
from ..core.pdf_parser import parse_pdf
from ..models.schemas import MarginaliaRequest

logger = logging.getLogger("queriously.marginalia")

router = APIRouter(prefix="/marginalia", tags=["marginalia"])

# Cache of parsed page texts per paper (avoids re-parsing for each batch).
_page_cache: dict[str, list[dict]] = {}


def _get_pages(paper_id: str, file_path: str | None = None) -> list[dict]:
    if paper_id in _page_cache:
        return _page_cache[paper_id]
    if not file_path:
        return []
    result = parse_pdf(file_path)
    pages = [{"page_number": p.page_number, "text": p.text} for p in result.pages]
    _page_cache[paper_id] = pages
    return pages


@router.post("/generate")
async def generate_marginalia(req: MarginaliaRequest) -> StreamingResponse:
    """Generate margin notes for the requested pages in batches of 3.
    Streams each note as an SSE event so the frontend can render them
    progressively. Ends with a `done` event."""

    async def event_stream():
        pages = _page_cache.get(req.paper_id, [])
        # Filter to requested pages.
        target_pages = [p for p in pages if p["page_number"] in req.pages]
        if not target_pages:
            target_pages = pages  # fallback: all pages

        batch_size = 3
        total_notes = 0

        for i in range(0, len(target_pages), batch_size):
            batch = target_pages[i : i + batch_size]
            notes = await generate_marginalia_batch(batch)

            for note in notes:
                total_notes += 1
                yield f"data: {json.dumps({'type': 'note', 'paper_id': req.paper_id, 'note': note})}\n\n"

        yield f"data: {json.dumps({'type': 'done', 'paper_id': req.paper_id, 'total_count': total_notes})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/cache-pages")
async def cache_pages(paper_id: str, file_path: str) -> dict:
    """Pre-populate the page text cache for a paper so /generate doesn't need
    to re-parse. Called by the Rust layer right after ingestion completes."""
    pages = _get_pages(paper_id, file_path)
    return {"paper_id": paper_id, "page_count": len(pages)}
