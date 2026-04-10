"""Recursive character-based text chunking with section awareness.

Spec §6.3 Step 4 — chunk size 512 tokens (~2048 chars), overlap 64 tokens
(~256 chars). Each chunk is tagged with its page number, section title,
and chunk index within the paper.
"""

from __future__ import annotations

from dataclasses import dataclass

from .pdf_parser import PageText

# Approximate tokens-to-chars ratio for English prose (1 token ≈ 4 chars).
CHUNK_SIZE = 2048  # ~512 tokens
OVERLAP = 256  # ~64 tokens


@dataclass
class Chunk:
    text: str
    page_number: int
    section_title: str | None
    chunk_index: int


def chunk_pages(pages: list[PageText], chunk_size: int = CHUNK_SIZE, overlap: int = OVERLAP) -> list[Chunk]:
    """Split page texts into overlapping chunks, preserving section labels."""
    chunks: list[Chunk] = []
    idx = 0

    for page in pages:
        text = page.text.strip()
        if not text:
            continue
        start = 0
        while start < len(text):
            end = start + chunk_size
            segment = text[start:end]
            # Try to break at the last sentence-ending punctuation so chunks
            # don't split mid-sentence.
            if end < len(text):
                for sep in ("\n\n", ".\n", ". ", "\n"):
                    last = segment.rfind(sep)
                    if last > chunk_size // 2:
                        segment = segment[: last + len(sep)]
                        end = start + len(segment)
                        break

            chunks.append(
                Chunk(
                    text=segment.strip(),
                    page_number=page.page_number,
                    section_title=page.section_title,
                    chunk_index=idx,
                )
            )
            idx += 1
            start = end - overlap
            if start < 0:
                start = 0

    return chunks
