"""ChromaDB persistent wrapper.

One collection per paper, ID'd by `paper_{sha256}`. The persistent directory
defaults to `~/.queriously/vectors/`.
"""

from __future__ import annotations

import os
from pathlib import Path

import chromadb

_VECTORS_DIR = str(Path.home() / ".queriously" / "vectors")


def _client() -> chromadb.ClientAPI:
    d = os.environ.get("QUERIOUSLY_VECTORS_DIR", _VECTORS_DIR)
    os.makedirs(d, exist_ok=True)
    return chromadb.PersistentClient(path=d)


def collection_name(paper_id: str) -> str:
    # ChromaDB collection names must be 3-63 chars, alphanumeric/underscore.
    return f"paper_{paper_id[:48]}"


def upsert_chunks(
    paper_id: str,
    ids: list[str],
    documents: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    client = _client()
    col = client.get_or_create_collection(
        name=collection_name(paper_id),
        metadata={"hnsw:space": "cosine"},
    )
    # ChromaDB caps batch at ~41k, but we're well under that for one paper.
    col.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)


def query_chunks(
    paper_id: str,
    query_embedding: list[float],
    top_k: int = 5,
    where: dict | None = None,
) -> dict:
    """Return top-k similar chunks. Returns the raw ChromaDB query result."""
    client = _client()
    col = client.get_collection(name=collection_name(paper_id))
    kwargs: dict = {
        "query_embeddings": [query_embedding],
        "n_results": top_k,
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where
    return col.query(**kwargs)


def query_multi_paper(
    paper_ids: list[str],
    query_embedding: list[float],
    top_k_per_paper: int = 5,
) -> list[dict]:
    """Cross-paper query: retrieve top_k from each paper and merge."""
    results: list[dict] = []
    client = _client()
    for pid in paper_ids:
        try:
            col = client.get_collection(name=collection_name(pid))
        except Exception:
            continue
        res = col.query(
            query_embeddings=[query_embedding],
            n_results=top_k_per_paper,
            include=["documents", "metadatas", "distances"],
        )
        # Flatten into a list of dicts for easier downstream merge.
        docs = res.get("documents", [[]])[0]
        metas = res.get("metadatas", [[]])[0]
        dists = res.get("distances", [[]])[0]
        for d, m, dist in zip(docs, metas, dists):
            results.append({"paper_id": pid, "document": d, "metadata": m, "distance": dist})
    results.sort(key=lambda r: r["distance"])
    return results


def delete_collection(paper_id: str) -> None:
    client = _client()
    try:
        client.delete_collection(name=collection_name(paper_id))
    except Exception:
        pass
