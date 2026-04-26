"""RAG question-answering endpoint — spec §6.4.

POST /qa  →  streaming SSE of tokens, followed by a final JSON payload
with sources and mode-specific metadata.
"""

from __future__ import annotations

import json
import logging
import re

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ..core.embedder import embed_texts
from ..core.llm import stream as llm_stream
from ..core.reading_modes import SYSTEM_PROMPTS, build_context_block
from ..core.vector_store import query_chunks, query_multi_paper
from ..models.schemas import QARequest

logger = logging.getLogger("queriously.qa")

router = APIRouter(tags=["qa"])

_FRONT_MATTER_TERMS = re.compile(
    r"\b(title|abstract|authors?|paper name|what is this paper|first page)\b",
    re.IGNORECASE,
)


def _retrieval_query(question: str, chat_history: list[dict[str, str]]) -> str:
    """Expand short follow-ups with the last user turn for retrieval only."""
    q = question.strip()
    if len(q.split()) > 4:
        return q

    for turn in reversed(chat_history):
        if turn.get("role") == "user":
            prev = (turn.get("content") or "").strip()
            if prev:
                return f"{prev}\nFollow-up: {q}"
    return q


def _wants_front_matter(question: str, chat_history: list[dict[str, str]]) -> bool:
    text = question
    for turn in chat_history[-4:]:
        text += "\n" + (turn.get("content") or "")
    return bool(_FRONT_MATTER_TERMS.search(text))


def _flatten_query_result(raw: dict, paper_id: str) -> list[dict]:
    docs = raw.get("documents", [[]])[0]
    metas = raw.get("metadatas", [[]])[0]
    dists = raw.get("distances", [[]])[0]
    return [
        {"document": d, "metadata": m, "distance": dist, "paper_id": paper_id}
        for d, m, dist in zip(docs, metas, dists)
    ]


def _dedupe_chunks(chunks: list[dict]) -> list[dict]:
    seen: set[tuple[str, int, int]] = set()
    out: list[dict] = []
    for c in chunks:
        meta = c.get("metadata", {})
        key = (
            str(c.get("paper_id", "")),
            int(meta.get("page") or 0),
            int(meta.get("chunk_index") or -1),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out


def _format_chat_history(chat_history: list[dict[str, str]], limit: int = 6) -> str:
    turns: list[str] = []
    for turn in chat_history[-limit:]:
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        turns.append(f"{role}: {content[:1200]}")
    return "\n".join(turns)


def _source_score(chunk: dict) -> float:
    distance = float(chunk.get("distance", 1.0) or 1.0)
    return max(0.0, min(1.0, 1.0 - distance))


def _evidence_status(chunks: list[dict], active_paper_id: str, front_matter: bool = False) -> dict:
    if not chunks:
        return {
            "level": "none",
            "label": "No source match",
            "reason": "No relevant passages were retrieved for this question.",
            "answerable": False,
        }

    scores = [_source_score(c) for c in chunks]
    best = max(scores)
    supporting = sum(1 for s in scores if s >= 0.42)
    pages = {
        int((c.get("metadata") or {}).get("page") or 0)
        for c in chunks
        if c.get("paper_id", active_paper_id) == active_paper_id
    }

    if front_matter and any(p == 1 for p in pages):
        return {
            "level": "strong" if best >= 0.25 else "partial",
            "label": "Front matter sourced",
            "reason": "Page 1/front-matter context was included for this metadata question.",
            "answerable": True,
        }

    if best < 0.18:
        return {
            "level": "weak",
            "label": "Weak evidence",
            "reason": "The closest retrieved passage is a poor semantic match.",
            "answerable": False,
        }
    if best < 0.32 and supporting < 2:
        return {
            "level": "weak",
            "label": "Weak evidence",
            "reason": "Only weakly related source passages were retrieved.",
            "answerable": False,
        }
    if best >= 0.58 or supporting >= 3 or len(pages) >= 2:
        return {
            "level": "strong",
            "label": "Well sourced",
            "reason": "Relevant passages with enough source support were retrieved.",
            "answerable": True,
        }
    return {
        "level": "partial",
        "label": "Partially sourced",
        "reason": "The answer is grounded in retrieved passages, but source support is limited.",
        "answerable": True,
    }


def _confidence_from_evidence(evidence: dict) -> str:
    return {
        "strong": "high",
        "partial": "medium",
        "weak": "low",
        "none": "low",
    }.get(evidence.get("level"), "low")


@router.post("/qa")
async def qa(req: QARequest) -> StreamingResponse:
    """Streaming QA. Sends SSE events: `token` for each LLM token, then
    `done` with the full response + sources JSON."""

    # --- Retrieve context ---
    include_front_matter = False
    if req.context_override:
        # Selection-based QA: use the selected text directly.
        context_chunks = [
            {"document": req.context_override, "metadata": {"page": 0, "section": "selection"}, "distance": 0.0}
        ]
    elif req.context_paper_ids:
        # Multi-paper session context.
        q_emb = embed_texts([_retrieval_query(req.question, req.chat_history)])[0]
        context_chunks = query_multi_paper(req.context_paper_ids, q_emb, top_k_per_paper=req.top_k)
    else:
        # Standard single-paper RAG.
        query_text = _retrieval_query(req.question, req.chat_history)
        q_emb = embed_texts([query_text])[0]
        raw = query_chunks(req.paper_id, q_emb, top_k=max(req.top_k, 12))
        context_chunks = _flatten_query_result(raw, req.paper_id)

        include_front_matter = _wants_front_matter(req.question, req.chat_history)
        if include_front_matter:
            try:
                front = query_chunks(req.paper_id, q_emb, top_k=3, where={"page": 1})
                context_chunks = _dedupe_chunks(
                    _flatten_query_result(front, req.paper_id) + context_chunks
                )[: max(req.top_k, 12)]
            except Exception:
                logger.exception("front-matter retrieval failed for %s", req.paper_id[:12])
        else:
            context_chunks = _dedupe_chunks(context_chunks)[: max(req.top_k, 8)]

    evidence = _evidence_status(context_chunks, req.paper_id, include_front_matter)
    confidence = _confidence_from_evidence(evidence)

    # --- Build prompt ---
    system = SYSTEM_PROMPTS.get(req.reading_mode, SYSTEM_PROMPTS["explain"])
    context_block = build_context_block(context_chunks)
    history_block = _format_chat_history(req.chat_history)
    user_msg = (
        f"Recent conversation, if any:\n{history_block or '(none)'}\n\n"
        f"Here is the relevant source material from the paper(s):\n\n"
        f"{context_block}\n\n"
        f"---\n\nQuestion: {req.question}"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_msg},
    ]

    # --- Sources payload ---
    sources = []
    for c in context_chunks:
        meta = c.get("metadata", {})
        sources.append({
            "paper_id": c.get("paper_id", req.paper_id),
            "page": meta.get("page", 0),
            "section": meta.get("section") or None,
            "text": (c.get("document", "") or "")[:300],
            "score": round(1.0 - c.get("distance", 0.0), 3),
        })

    # --- Stream response ---
    async def event_stream():
        full_text = ""
        if not evidence["answerable"]:
            full_text = (
                "I don't have enough relevant source evidence to answer that from "
                "the retrieved paper context. Try selecting the relevant passage, "
                "opening the page you mean, or re-indexing the paper."
            )
            yield f"data: {json.dumps({'type': 'token', 'token': full_text})}\n\n"
        else:
            async for token in llm_stream(messages):
                full_text += token
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        # Parse mode-specific blocks from the full text.
        counterpoint = None
        followup = None
        margin_note = None

        if req.reading_mode == "challenge" and "Counterpoint:" in full_text:
            parts = full_text.split("Counterpoint:", 1)
            full_text = parts[0].strip()
            counterpoint = parts[1].strip()
        elif req.reading_mode == "connect" and "Your turn:" in full_text:
            parts = full_text.split("Your turn:", 1)
            full_text = parts[0].strip()
            followup = parts[1].strip()
        elif req.reading_mode == "annotate" and "Margin note:" in full_text:
            parts = full_text.split("Margin note:", 1)
            full_text = parts[0].strip()
            margin_note = parts[1].strip()

        done_payload = {
            "type": "done",
            "answer": full_text,
            "counterpoint": counterpoint,
            "followup_question": followup,
            "margin_note": margin_note,
            "sources": sources,
            "confidence": confidence,
            "evidence": evidence,
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
