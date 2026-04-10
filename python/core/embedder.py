"""Embedding wrapper around sentence-transformers.

Uses all-MiniLM-L6-v2 by default per spec. The model is loaded lazily on first
call so startup isn't blocked by a heavy download if the user hasn't opened a
paper yet.
"""

from __future__ import annotations

from functools import lru_cache

DEFAULT_MODEL = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model(name: str = DEFAULT_MODEL):
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(name)


def embed_texts(texts: list[str], model_name: str = DEFAULT_MODEL) -> list[list[float]]:
    """Return a list of embedding vectors, one per input text."""
    model = _get_model(model_name)
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()
