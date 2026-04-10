import { useEffect, useState } from "react";
import { X, Check, Loader2, ExternalLink, Upload } from "lucide-react";
import { useSettingsStore, type LlmProvider } from "../../store/settingsStore";
import { api } from "../../lib/tauri";
import { Logo } from "../ui/Logo";

type Step = 1 | 2 | 3;

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-surface-raised border border-surface-border rounded-xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-surface-overlay text-text-muted hover:text-text-primary transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step
                  ? "bg-accent-primary"
                  : s < step
                    ? "bg-accent-primary/50"
                    : "bg-surface-overlay"
              }`}
            />
          ))}
        </div>

        <div className="p-8 pt-4">
          {step === 1 && <WelcomeStep onNext={() => setStep(2)} />}
          {step === 2 && (
            <AISetupStep
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <OpenPaperStep onDone={onClose} onBack={() => setStep(2)} />
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="text-accent-primary w-16 h-16">
        <Logo />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">
          Your papers, but alive.
        </h2>
        <p className="mt-3 text-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
          Queriously reads alongside you — generating margin notes, answering
          questions, and helping you think across papers. Local-first, your
          model, your data.
        </p>
      </div>
      <button onClick={onNext} className="q-btn q-btn-primary px-8 py-2 mt-2">
        Get Started
      </button>
    </div>
  );
}

function AISetupStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const provider = useSettingsStore((s) => s.llmProvider);
  const apiKey = useSettingsStore((s) => s.llmApiKey);
  const baseUrl = useSettingsStore((s) => s.llmBaseUrl);
  const model = useSettingsStore((s) => s.llmModel);
  const setProvider = useSettingsStore((s) => s.setLlmProvider);
  const setApiKey = useSettingsStore((s) => s.setLlmApiKey);
  const setBaseUrl = useSettingsStore((s) => s.setLlmBaseUrl);
  const setModel = useSettingsStore((s) => s.setLlmModel);

  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  async function checkOllama() {
    setChecking(true);
    try {
      const status = await api.checkOllama();
      setOllamaRunning(status.running);
      setOllamaModels(status.models);
    } catch {
      setOllamaRunning(false);
    }
    setChecking(false);
  }

  useEffect(() => {
    if (provider === "ollama") {
      checkOllama();
    }
  }, [provider]);

  async function handleNext() {
    setSaving(true);
    try {
      const config = useSettingsStore.getState().getLlmConfig();
      await api.updateLlmConfig(config);
    } catch (err) {
      console.warn("Failed to push config to sidecar:", err);
    }
    setSaving(false);
    onNext();
  }

  const providers: { id: LlmProvider; label: string; desc: string }[] = [
    {
      id: "ollama",
      label: "Local (Ollama)",
      desc: "Free, private, runs on your machine",
    },
    { id: "openai", label: "OpenAI", desc: "GPT-4o, GPT-4o-mini" },
    { id: "anthropic", label: "Anthropic", desc: "Claude Sonnet, Opus" },
    {
      id: "custom",
      label: "Other",
      desc: "Any LiteLLM-compatible endpoint",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-text-primary">AI Setup</h2>
        <p className="mt-1 text-text-secondary text-sm">
          Choose how Queriously talks to an LLM.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              provider === p.id
                ? "border-accent-primary bg-accent-primary/10"
                : "border-surface-border hover:border-text-muted"
            }`}
          >
            <div className="text-sm font-medium text-text-primary">
              {p.label}
            </div>
            <div className="text-xs text-text-muted mt-0.5">{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Provider-specific config */}
      {provider === "ollama" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            ) : ollamaRunning ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <X className="w-4 h-4 text-red-400" />
            )}
            <span className="text-text-secondary">
              {checking
                ? "Checking Ollama..."
                : ollamaRunning
                  ? `Ollama running (${ollamaModels.length} model${ollamaModels.length !== 1 ? "s" : ""})`
                  : "Ollama not detected"}
            </span>
            {!checking && (
              <button
                onClick={checkOllama}
                className="text-xs text-accent-primary hover:underline ml-auto"
              >
                Refresh
              </button>
            )}
          </div>
          {!ollamaRunning && !checking && (
            <div className="text-xs text-text-muted bg-surface-overlay p-3 rounded-lg space-y-1">
              <p>Install Ollama and pull a model:</p>
              <code className="block font-mono text-text-secondary">
                ollama pull llama3.2
              </code>
            </div>
          )}
          {ollamaModels.length > 0 && (
            <select
              value={model}
              onChange={(e) => setModel(`ollama/${e.target.value}`)}
              className="q-input w-full text-sm"
            >
              {ollamaModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {provider === "openai" && (
        <div className="space-y-3">
          <input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="q-input w-full text-sm"
          />
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent-primary hover:underline"
          >
            Get an API key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {provider === "anthropic" && (
        <div className="space-y-3">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="q-input w-full text-sm"
          />
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent-primary hover:underline"
          >
            Get an API key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {provider === "custom" && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Model name (e.g. mistral/mistral-large)"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="q-input w-full text-sm"
          />
          <input
            type="text"
            placeholder="Base URL (e.g. http://localhost:8080/v1)"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="q-input w-full text-sm"
          />
          <input
            type="password"
            placeholder="API key (optional)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="q-input w-full text-sm"
          />
        </div>
      )}

      <p className="text-xs text-text-muted text-center">
        Your API key is stored locally in the system keychain. It is never
        transmitted to Queriously's servers — there are none.
      </p>

      <div className="flex justify-between">
        <button onClick={onBack} className="q-btn px-4 py-1.5 text-sm">
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="q-btn q-btn-primary px-6 py-1.5 text-sm"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

function OpenPaperStep({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack: () => void;
}) {
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);

  function finish() {
    setOnboarded(true);
    onDone();
  }

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <Upload className="w-12 h-12 text-accent-primary" />
      <div>
        <h2 className="text-xl font-semibold text-text-primary">
          Open a Paper
        </h2>
        <p className="mt-2 text-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
          Drag a PDF onto the window, or use{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-surface-overlay text-text-primary text-xs font-mono">
            ⌘O
          </kbd>{" "}
          to browse. Queriously will index it automatically and start generating
          margin notes.
        </p>
      </div>
      <div className="flex gap-3 mt-2">
        <button onClick={onBack} className="q-btn px-4 py-1.5 text-sm">
          Back
        </button>
        <button onClick={finish} className="q-btn q-btn-primary px-8 py-2">
          Let's Go
        </button>
      </div>
    </div>
  );
}
