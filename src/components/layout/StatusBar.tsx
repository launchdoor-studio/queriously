import { Eye, EyeOff, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/tauri";
import { useMarginaliaStore } from "../../store/marginaliaStore";
import { usePdfStore } from "../../store/pdfStore";

export function StatusBar() {
  const currentPage = usePdfStore((s) => s.currentPage);
  const pageCount = usePdfStore((s) => s.pageCount);
  const zoom = usePdfStore((s) => s.zoom);
  const setZoom = usePdfStore((s) => s.setZoom);
  const marginaliaVisible = useMarginaliaStore((s) => s.visible);
  const setMarginaliaVisible = useMarginaliaStore((s) => s.setVisible);
  const marginaliaCount = useMarginaliaStore((s) => s.notes.length);
  const isGenerating = useMarginaliaStore((s) => s.isGenerating);
  const [aiReady, setAiReady] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const s = await api.sidecarStatus();
        if (alive) setAiReady(s.ready);
      } catch {
        if (alive) setAiReady(false);
      }
    }
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <footer className="h-8 shrink-0 flex items-center gap-4 px-3 border-t border-surface-border bg-surface-raised text-xs text-text-secondary">
      <span className="tabular-nums">
        Page {currentPage}
        {pageCount ? ` / ${pageCount}` : ""}
      </span>
      <button
        className="flex items-center gap-1 hover:text-text-primary transition-colors"
        onClick={() => setMarginaliaVisible(!marginaliaVisible)}
        title="Toggle marginalia"
      >
        {marginaliaVisible ? (
          <Eye className="w-3 h-3" />
        ) : (
          <EyeOff className="w-3 h-3" />
        )}
        Marginalia {marginaliaVisible ? "on" : "off"}
        {isGenerating && (
          <span className="text-accent-primary animate-pulse ml-1">generating...</span>
        )}
        {!isGenerating && marginaliaCount > 0 && (
          <span className="text-text-muted ml-1">({marginaliaCount})</span>
        )}
      </button>
      <span className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            aiReady === null
              ? "bg-text-muted"
              : aiReady
              ? "bg-accent-success"
              : "bg-accent-error"
          }`}
        />
        AI {aiReady === null ? "..." : aiReady ? "ready" : "offline"}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          className="q-btn py-0.5"
          onClick={() => setZoom(zoom - 0.1)}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="tabular-nums w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="q-btn py-0.5"
          onClick={() => setZoom(zoom + 0.1)}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
}
