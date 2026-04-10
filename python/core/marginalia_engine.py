"""Marginalia generation pipeline — spec §8.4.

Processes a paper in page-order batches of 3 pages, sending a structured
prompt to the LLM that instructs it to output JSON margin notes. Phase 1
covers Restatement, Assumption, and Limitation types only (Contradiction
and Connection require a second-pass claim comparison — Phase 2).

Target density: ~15-30 notes for a 20-page paper (OQ-10).
"""

from __future__ import annotations

import json
import logging

from ..core.llm import complete

logger = logging.getLogger("queriously.marginalia")

MARGINALIA_PROMPT = """\
You are Queriously, an AI that annotates academic papers with concise margin notes.
For the following pages, generate margin notes ONLY when genuinely warranted — quality
over quantity. Target roughly 1 note per 2 substantive paragraphs. Do NOT force a note
for every paragraph.

Each note must be one of these types:
- "restatement": Restate a dense or jargon-heavy claim in plain language.
- "assumption": Flag a claim the paper makes without proof or citation — an axiom the argument rests on.
- "limitation": A hedged claim, scope restriction, or acknowledged weakness.

Output ONLY a JSON array. Each element:
{{
  "page": <page_number>,
  "paragraph_index": <0-based paragraph on that page>,
  "type": "restatement" | "assumption" | "limitation",
  "note_text": "<concise note, 1-2 sentences max>"
}}

If no notes are warranted for these pages, output an empty array: []

Here are the pages:

{pages_text}
"""


async def generate_marginalia_batch(
    pages: list[dict],  # [{"page_number": int, "text": str}]
) -> list[dict]:
    """Generate margin notes for a batch of pages. Returns raw dicts matching
    the MarginaliaNote schema."""

    pages_text = ""
    for p in pages:
        pages_text += f"\n--- Page {p['page_number']} ---\n{p['text']}\n"

    prompt = MARGINALIA_PROMPT.format(pages_text=pages_text)

    try:
        raw = await complete(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2048,
        )
        # The model should return a JSON array. Strip markdown fences if present.
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        notes = json.loads(raw)
        if not isinstance(notes, list):
            return []
        return notes
    except (json.JSONDecodeError, Exception) as e:
        logger.warning("marginalia generation failed for batch: %s", e)
        return []
