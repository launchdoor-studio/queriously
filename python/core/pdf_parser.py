"""PDF parsing pipeline using PyMuPDF (fitz) for text/metadata and
pdfplumber for table/column detection when needed.

Spec §6.3 — Steps 1–3: metadata, full text per page, math detection.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

import fitz  # PyMuPDF


@dataclass
class PageText:
    page_number: int  # 1-based
    text: str
    section_title: str | None = None


@dataclass
class EquationHit:
    page: int
    raw_latex: str
    context: str  # surrounding sentence


@dataclass
class ParseResult:
    title: str | None
    authors: str | None
    abstract: str | None
    year: int | None
    page_count: int
    toc: list[tuple[int, str, int]]  # (level, title, page)
    pages: list[PageText]
    equations: list[EquationHit]


_DISPLAY_MATH = re.compile(r"\$\$(.+?)\$\$", re.DOTALL)
_INLINE_MATH = re.compile(r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)")
_ENV_MATH = re.compile(
    r"\\begin\{(equation|align|gather|multline)\*?\}(.+?)\\end\{\1\*?\}",
    re.DOTALL,
)
_YEAR = re.compile(r"((?:19|20)\d{2})")


def parse_pdf(path: str) -> ParseResult:
    doc = fitz.open(path)

    # --- Step 1: metadata ---
    meta = doc.metadata or {}
    title = meta.get("title") or None
    authors = meta.get("author") or None
    year: int | None = None
    if meta.get("creationDate"):
        m = _YEAR.search(meta["creationDate"])
        if m:
            year = int(m.group(1))

    toc = [(lvl, t, pg) for lvl, t, pg in doc.get_toc()]

    # --- Step 2: full text per page ---
    pages: list[PageText] = []
    current_section: str | None = None
    toc_page_map: dict[int, str] = {}
    for _, t, pg in toc:
        toc_page_map.setdefault(pg, t)

    for i in range(len(doc)):
        pg = doc[i]
        text = pg.get_text("text")
        if (i + 1) in toc_page_map:
            current_section = toc_page_map[i + 1]
        pages.append(PageText(page_number=i + 1, text=text, section_title=current_section))

    # --- Step 3: math detection ---
    equations: list[EquationHit] = []
    for p in pages:
        for pattern in (_DISPLAY_MATH, _INLINE_MATH, _ENV_MATH):
            for m in pattern.finditer(p.text):
                raw = m.group(0).strip()
                start = max(0, m.start() - 60)
                end = min(len(p.text), m.end() + 60)
                ctx = p.text[start:end].replace("\n", " ").strip()
                equations.append(EquationHit(page=p.page_number, raw_latex=raw, context=ctx))

    # Extract abstract from first page (heuristic: text between "Abstract" and next heading)
    abstract: str | None = None
    if pages:
        first = pages[0].text
        abs_match = re.search(r"(?i)abstract[:\s]*\n(.+?)(?:\n\n|\n[A-Z1-9])", first, re.DOTALL)
        if abs_match:
            abstract = abs_match.group(1).strip()[:2000]

    doc.close()
    return ParseResult(
        title=title,
        authors=authors,
        abstract=abstract,
        year=year,
        page_count=len(pages),
        toc=toc,
        pages=pages,
        equations=equations,
    )
