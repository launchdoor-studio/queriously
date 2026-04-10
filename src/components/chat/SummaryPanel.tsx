import { listen } from "@tauri-apps/api/event";
import { Copy, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../../lib/tauri";
import { usePdfStore } from "../../store/pdfStore";

export function SummaryPanel() {
  const paper = usePdfStore((s) => s.paper);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // Listen for streaming tokens.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    listen<{ paper_id: string; token: string }>("summary:token", (e) => {
      if (e.payload.paper_id === paper?.id) {
        setContent((c) => c + e.payload.token);
      }
    }).then((u) => {
      unsub = u;
    });
    return () => unsub?.();
  }, [paper?.id]);

  async function generate() {
    if (!paper) return;
    setContent("");
    setLoading(true);
    try {
      const result = await api.summarizePaper(paper.id, "bullets", "full");
      setContent(result);
    } catch (err) {
      setContent(`Error: ${err}`);
    } finally {
      setLoading(false);
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
