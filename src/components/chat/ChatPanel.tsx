import { AlertCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { usePdfStore } from "../../store/pdfStore";
import { useChat } from "../../hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { ReadingModeSelector } from "./ReadingModeSelector";
import { api } from "../../lib/tauri";

export function ChatPanel() {
  const paper = usePdfStore((s) => s.paper);
  const paperId = paper?.id ?? null;
  const messages = useChatStore((s) =>
    paperId ? s.messagesByPaper[paperId] ?? [] : [],
  );
  const isLoading = useChatStore((s) => s.isLoading);
  const clearChat = useChatStore((s) => s.clearChat);
  const setActivePaper = useChatStore((s) => s.setActivePaper);
  const { send } = useChat();
  const [input, setInput] = useState("");
  const [aiReady, setAiReady] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep chat store in sync with the active paper.
  useEffect(() => {
    setActivePaper(paperId);
  }, [paperId, setActivePaper]);

  // Check sidecar health before allowing sends.
  useEffect(() => {
    api.sidecarStatus().then((s) => setAiReady(s.ready)).catch(() => setAiReady(false));
  }, []);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function jumpToPage(page: number) {
    const el = document.querySelector<HTMLElement>(`[data-page="${page}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading || !paper) return;
    setInput("");
    send(q);
  }

  if (!paper) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-xs p-4 text-center">
        Open a paper to start asking questions.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* AI offline banner */}
      {!aiReady && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-accent-error/10 text-accent-error text-xs border-b border-accent-error/20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          AI sidecar is offline. Check that the Python backend is running.
        </div>
      )}
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-auto px-3 py-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-muted text-xs text-center">
            Ask a question about this paper.
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} onJumpToPage={jumpToPage} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-surface-border">
        <ReadingModeSelector />
        <form onSubmit={onSubmit} className="flex items-end gap-1.5 p-2">
          <textarea
            className="q-input flex-1 min-h-[36px] max-h-32 resize-none text-sm"
            placeholder="Ask about this paper..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="q-btn-primary py-2 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              className="q-btn py-2 text-text-muted hover:text-accent-error"
              onClick={clearChat}
              title="Clear chat"
              aria-label="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
