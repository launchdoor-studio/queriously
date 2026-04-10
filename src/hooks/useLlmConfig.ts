import { useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { api } from "../lib/tauri";

/**
 * On app startup, push the locally-stored LLM config to the Python sidecar
 * so it knows which model/key/base to use. Retries once after a short delay
 * (sidecar may still be starting).
 */
export function useLlmConfig() {
  const getLlmConfig = useSettingsStore((s) => s.getLlmConfig);

  useEffect(() => {
    let cancelled = false;

    async function push() {
      const config = getLlmConfig();
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
  }, [getLlmConfig]);
}
