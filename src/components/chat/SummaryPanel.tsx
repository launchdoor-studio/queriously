import { listen } from "@tauri-apps/api/event";
import { Copy, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../../lib/tauri";
import { usePdfStore } from "../../store/pdfStore";
import { useSummaryStore } from "../../store/summaryStore";

export function SummaryPanel() {
  const paper = usePdfStore((s) => s.paper);
  const paperId = paper?.id;
  const content = useSummaryStore((s) => (paperId ? s.summaries[paperId] ?? "" : ""));
  const loading = useSummaryStore((s) => s.loadingPaperId === paperId);
  const setContent = useSummaryStore((s) => s.setContent);
  const appendToken = useSummaryStore((s) => s.appendToken);
  const setLoading = useSummaryStore((s) => s.setLoading);
  const clear = useSummaryStore((s) => s.clear);

  // Listen for streaming tokens.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    listen<{ paper_id: string; token: string }>("summary:token", (e) => {
      appendToken(e.payload.paper_id, e.payload.token);
    }).then((u) => {
      unsub = u;
    });
    return () => unsub?.();
  }, [appendToken]);

  async function generate() {
    if (!paperId) return;
    clear(paperId);
    setLoading(paperId);
    try {
      const result = await api.summarizePaper(paperId, "bullets", "full");
      setContent(paperId, result);
    } catch (err) {
      setContent(paperId, `Error: ${err}`);
    } finally {
      setLoading(null);
    }
  }

  if (!paper) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-xs p-4">
        Open a paper to generate a summary.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-surface-border">
        <button
          className="q-btn-primary text-xs"
          onClick={generate}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {content ? "Regenerate" : "Summarize"}
        </button>
        {content && (
          <button
            className="q-btn text-xs"
            onClick={() => navigator.clipboard.writeText(content)}
            title="Copy summary"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {content ? (
          <ReactMarkdown
            className="prose prose-sm prose-invert max-w-none text-text-primary
                       prose-li:my-0.5 prose-p:my-1.5 prose-headings:text-text-primary
                       prose-strong:text-text-primary"
          >
            {content}
          </ReactMarkdown>
        ) : (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            {loading ? (
              <span className="animate-pulse">Generating summary...</span>
            ) : (
              "Click Summarize to generate bullet points."
            )}
          </div>
        )}
        {loading && content && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-accent-primary animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
