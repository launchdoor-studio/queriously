import { useEffect, useRef } from "react";
import { API_KEY_FALLBACK_KEY, useSettingsStore } from "../store/settingsStore";
import { api } from "../lib/tauri";

const LEGACY_API_KEY_KEY = "queriously.llm.apiKey";

function readFallbackApiKey() {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem(API_KEY_FALLBACK_KEY) ??
    window.localStorage.getItem(LEGACY_API_KEY_KEY) ??
    ""
  );
}

function writeFallbackApiKey(key: string) {
  if (typeof window === "undefined") return;
  const trimmed = key.trim();
  if (trimmed) {
    window.localStorage.setItem(API_KEY_FALLBACK_KEY, trimmed);
  } else {
    window.localStorage.removeItem(API_KEY_FALLBACK_KEY);
  }
  window.localStorage.removeItem(LEGACY_API_KEY_KEY);
}

/**
 * On app startup, push the locally-stored LLM config to the Python sidecar
 * so it knows which model/key/base to use. Retries once after a short delay
 * (sidecar may still be starting).
 */
export function useLlmConfig() {
  const llmModel = useSettingsStore((s) => s.llmModel);
  const llmApiKey = useSettingsStore((s) => s.llmApiKey);
  const llmApiKeyLoaded = useSettingsStore((s) => s.llmApiKeyLoaded);
  const llmBaseUrl = useSettingsStore((s) => s.llmBaseUrl);
  const setLlmApiKey = useSettingsStore((s) => s.setLlmApiKey);
  const setLlmApiKeyLoaded = useSettingsStore((s) => s.setLlmApiKeyLoaded);
  const lastSyncedApiKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadKey() {
      try {
        const stored = await api.getLlmApiKey();
        if (!cancelled) {
          const key = stored ?? readFallbackApiKey();
          lastSyncedApiKeyRef.current = stored ?? null;
          setLlmApiKey(key);
        }
      } catch (err) {
        console.warn("failed to load LLM API key", err);
        const key = readFallbackApiKey();
        if (!cancelled) {
          lastSyncedApiKeyRef.current = null;
          setLlmApiKey(key);
        }
      } finally {
        if (!cancelled) {
          setLlmApiKeyLoaded(true);
        }
      }
    }

    loadKey();
    return () => {
      cancelled = true;
    };
  }, [setLlmApiKey, setLlmApiKeyLoaded]);

  useEffect(() => {
    if (!llmApiKeyLoaded) return;
    if (lastSyncedApiKeyRef.current === llmApiKey) return;
    if (lastSyncedApiKeyRef.current === null && !llmApiKey) return;

    api
      .setLlmApiKey(llmApiKey || null)
      .then(() => {
        writeFallbackApiKey(llmApiKey);
        lastSyncedApiKeyRef.current = llmApiKey;
      })
      .catch((err) => {
        console.warn("failed to persist LLM API key", err);
        writeFallbackApiKey(llmApiKey);
        lastSyncedApiKeyRef.current = llmApiKey;
      });
  }, [llmApiKey, llmApiKeyLoaded]);

  useEffect(() => {
    let cancelled = false;

    async function push() {
      if (!llmApiKeyLoaded) return;
      const config = {
        model: llmModel,
        api_key: llmApiKey || null,
        base_url: llmBaseUrl || null,
      };
      // Don't push the default Ollama config if user hasn't onboarded yet
      if (!config.model) return;
      try {
        await api.updateLlmConfig(config);
      } catch {
        // Sidecar might not be ready yet — retry once after 3s
        if (!cancelled) {
          setTimeout(async () => {
            if (cancelled) return;
            try {
              await api.updateLlmConfig(config);
            } catch {
              // Silent — StatusBar shows AI offline indicator
            }
          }, 3000);
        }
      }
    }

    push();
    return () => {
      cancelled = true;
    };
  }, [llmApiKey, llmApiKeyLoaded, llmBaseUrl, llmModel]);
}
