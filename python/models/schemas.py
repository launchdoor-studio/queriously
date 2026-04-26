"""Pydantic models shared across routers — spec §9 (Python Sidecar)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class PaperMetadata(BaseModel):
    title: str | None = None
    authors: str | None = None
    abstract: str | None = None
    year: int | None = None
    page_count: int = 0


class IngestRequest(BaseModel):
    paper_id: str
    file_path: str


class IngestProgress(BaseModel):
    paper_id: str
    step: str
    percent: int


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
    reading_mode: Literal["explain", "challenge", "connect", "annotate"] = "explain"
    context_paper_ids: list[str] = []
    context_override: str | None = None
    chat_history: list[dict[str, str]] = []
    top_k: int = 5


class QAChunk(BaseModel):
    paper_id: str
    page: int
    section: str | None = None
    text: str
    score: float


class EvidenceStatus(BaseModel):
    level: Literal["none", "weak", "partial", "strong"]
    label: str
    reason: str
    answerable: bool = True


class DraftAnnotation(BaseModel):
    paper_id: str
    page: int
    selected_text: str
    note_text: str


class QAResponse(BaseModel):
    answer: str
    counterpoint: str | None = None
    followup_question: str | None = None
    draft_annotation: DraftAnnotation | None = None
    sources: list[QAChunk] = []
    confidence: Literal["low", "medium", "high"] = "medium"
    evidence: EvidenceStatus | None = None


class MarginaliaRequest(BaseModel):
    paper_id: str
    pages: list[int]


class MarginaliaNote(BaseModel):
    page: int
    paragraph_index: int
    type: Literal["restatement", "assumption", "contradiction", "connection", "limitation"]
    note_text: str
    ref_page: int | None = None


class MarginaliaResponse(BaseModel):
    paper_id: str
    notes: list[MarginaliaNote]


class SummarizeRequest(BaseModel):
    paper_id: str
    mode: Literal["bullets", "critique", "eli5"] = "bullets"
    scope: str = "full"
    content: str | None = None


class EquationPlotRequest(BaseModel):
    latex: str
    variable: str = "x"
    x_min: float = -10.0
    x_max: float = 10.0
    resolution: int = 500
