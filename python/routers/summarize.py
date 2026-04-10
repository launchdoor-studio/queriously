"""Summarization endpoint — spec §8.7.

POST /summarize  →  streaming SSE summary generation.
Phase 1 ships Bullets mode only.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..core.embedder import embed_texts
from ..core.llm import stream as llm_stream
from ..core.vector_store import query_chunks
from ..models.schemas import SummarizeRequest

logger = logging.getLogger("queriously.summarize")

router = APIRouter(tags=["summarize"])

PROMPTS = {
    "bullets": (
        "You are Queriously, a research reading assistant. Summarize the following "
        "paper content as 7-10 concise bullet points covering the key findings, "
        "contributions, and methodology. Cite page numbers like [p.3] where relevant. "
        "Be specific — avoid vague bullet points."
    ),
    "critique": (
        "You are Queriously, a research reading assistant. Write a structured critical "
        "review of the paper: Strengths (3-4 points), Weaknesses (3-4 points), "
        "Methodology notes, and Open questions raised but not answered. Cite pages."
    ),
    "eli5": (
        "You are Queriously, a research reading assistant. Explain this paper to a "
        "smart non-expert in plain language. Avoid jargon. Use analogies where helpful. "
        "Cover what the paper does, why it matters, and what the main finding is."
    ),
}


@router.post("/summarize")
async def summarize(req: SummarizeRequest) -> StreamingResponse:
    # Retrieve context from the paper.
    if req.content:
        context = req.content
    else:
        q_emb = embed_texts(["comprehensive summary of the paper"])[0]
        raw = query_chunks(req.paper_id, q_emb, top_k=12)
        docs = raw.get("documents", [[]])[0]
        context = "\n\n---\n\n".join(docs)

    system = PROMPTS.get(req.mode, PROMPTS["bullets"])
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Here is the paper content:\n\n{context}"},
    ]

    async def event_stream():
        full = ""
        async for token in llm_stream(messages, max_tokens=2048):
            full += token
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'content': full})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
