"""Configuration endpoints — update LLM settings at runtime and detect Ollama."""

from __future__ import annotations

import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["config"])


class LLMConfig(BaseModel):
    model: str  # e.g. "ollama/llama3.2", "gpt-4o-mini", "claude-sonnet-4-20250514"
    api_key: str | None = None
    base_url: str | None = None


class OllamaStatus(BaseModel):
    running: bool
    models: list[str]


@router.post("/config/llm")
async def update_llm_config(cfg: LLMConfig) -> dict:
    """Update the LLM environment variables used by the llm module at runtime."""
    os.environ["QUERIOUSLY_LLM_MODEL"] = cfg.model
    if cfg.api_key:
        os.environ["QUERIOUSLY_LLM_API_KEY"] = cfg.api_key
    else:
        os.environ.pop("QUERIOUSLY_LLM_API_KEY", None)
    if cfg.base_url:
        os.environ["QUERIOUSLY_LLM_BASE"] = cfg.base_url
    else:
        os.environ.pop("QUERIOUSLY_LLM_BASE", None)
    return {"ok": True, "model": cfg.model}


@router.get("/config/llm")
async def get_llm_config() -> dict:
    """Return the current LLM config (without the API key for security)."""
    return {
        "model": os.environ.get("QUERIOUSLY_LLM_MODEL", "ollama/llama3.2"),
        "has_api_key": bool(os.environ.get("QUERIOUSLY_LLM_API_KEY")),
        "base_url": os.environ.get("QUERIOUSLY_LLM_BASE"),
    }


@router.get("/ollama/status", response_model=OllamaStatus)
async def ollama_status() -> OllamaStatus:
    """Check if Ollama is running locally and list available models."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://127.0.0.1:11434/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                return OllamaStatus(running=True, models=models)
    except Exception:
        pass
    return OllamaStatus(running=False, models=[])
