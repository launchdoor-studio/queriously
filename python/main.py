"""Queriously Python sidecar.

Spawned by the Rust/Tauri shell on app launch. Starts a FastAPI server on a
free port, writes a one-line JSON handshake to stdout (so Rust can discover
the port), then serves AI/RAG endpoints to the Tauri layer over HTTP.

Kept intentionally thin in Phase 1: only /health and /version are wired.
Ingestion, QA, marginalia, summarization, and equation endpoints land in
later steps.
"""

from __future__ import annotations

import json
import socket
import sys
import threading
import time

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

APP_VERSION = "0.1.0"

app = FastAPI(title="Queriously Sidecar", version=APP_VERSION)

# --- routers ---
from .routers.ingest import router as ingest_router  # noqa: E402
from .routers.qa import router as qa_router  # noqa: E402
from .routers.marginalia import router as marginalia_router  # noqa: E402
from .routers.summarize import router as summarize_router  # noqa: E402
from .routers.config import router as config_router  # noqa: E402

app.include_router(ingest_router)
app.include_router(qa_router)
app.include_router(marginalia_router)
app.include_router(summarize_router)
app.include_router(config_router)


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_secs: float


_STARTED_AT = time.monotonic()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=APP_VERSION,
        uptime_secs=round(time.monotonic() - _STARTED_AT, 2),
    )


@app.get("/version")
def version() -> dict[str, str]:
    return {"version": APP_VERSION}


def _pick_free_port() -> int:
    """Ask the kernel for an available localhost port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _announce(port: int) -> None:
    """First line on stdout is a JSON handshake the Rust sidecar manager reads."""
    sys.stdout.write(json.dumps({"status": "ready", "port": port}) + "\n")
    sys.stdout.flush()


def main() -> None:
    port = _pick_free_port()
    # Announce once uvicorn is actually listening, not before it binds.
    threading.Timer(0.25, _announce, args=(port,)).start()
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
    )


if __name__ == "__main__":
    main()
