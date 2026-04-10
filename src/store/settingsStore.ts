import { create } from "zustand";

export type ThemeName = "dark" | "light";
export type LlmProvider = "ollama" | "openai" | "anthropic" | "custom";

const THEME_KEY = "queriously.theme";
const PROVIDER_KEY = "queriously.llm.provider";
const MODEL_KEY = "queriously.llm.model";
const API_KEY_KEY = "queriously.llm.apiKey";
const BASE_URL_KEY = "queriously.llm.baseUrl";
const ONBOARDED_KEY = "queriously.onboarded";

function initialTheme(): ThemeName {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(THEME_KEY) as ThemeName | null;
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-light");
  root.classList.add(`theme-${theme}`);
  window.localStorage.setItem(THEME_KEY, theme);
}

const PROVIDER_MODELS: Record<LlmProvider, string> = {
  ollama: "ollama/llama3.2",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  custom: "",
};

type SettingsState = {
  theme: ThemeName;
  onboarded: boolean;
  llmProvider: LlmProvider;
  llmModel: string;
  llmApiKey: string;
  llmBaseUrl: string;

  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  setOnboarded: (v: boolean) => void;
  setLlmProvider: (p: LlmProvider) => void;
  setLlmModel: (m: string) => void;
  setLlmApiKey: (k: string) => void;
  setLlmBaseUrl: (u: string) => void;
  getLlmConfig: () => { model: string; api_key?: string | null; base_url?: string | null };
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  const theme = initialTheme();
  applyTheme(theme);

  return {
    theme,
    onboarded: window.localStorage.getItem(ONBOARDED_KEY) === "true",
    llmProvider: (window.localStorage.getItem(PROVIDER_KEY) as LlmProvider) || "ollama",
    llmModel: window.localStorage.getItem(MODEL_KEY) || "ollama/llama3.2",
    llmApiKey: window.localStorage.getItem(API_KEY_KEY) || "",
    llmBaseUrl: window.localStorage.getItem(BASE_URL_KEY) || "",

    setTheme(theme) {
      applyTheme(theme);
      set({ theme });
    },
    toggleTheme() {
      const next: ThemeName = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      set({ theme: next });
    },
    setOnboarded(v) {
      window.localStorage.setItem(ONBOARDED_KEY, String(v));
      set({ onboarded: v });
    },
    setLlmProvider(p) {
      window.localStorage.setItem(PROVIDER_KEY, p);
      const model = PROVIDER_MODELS[p] || get().llmModel;
      window.localStorage.setItem(MODEL_KEY, model);
      set({ llmProvider: p, llmModel: model });
    },
    setLlmModel(m) {
      window.localStorage.setItem(MODEL_KEY, m);
      set({ llmModel: m });
    },
    setLlmApiKey(k) {
      window.localStorage.setItem(API_KEY_KEY, k);
      set({ llmApiKey: k });
    },
    setLlmBaseUrl(u) {
      window.localStorage.setItem(BASE_URL_KEY, u);
      set({ llmBaseUrl: u });
    },
    getLlmConfig() {
      const s = get();
      return {
        model: s.llmModel,
        api_key: s.llmApiKey || null,
        base_url: s.llmBaseUrl || null,
      };
    },
  };
});
