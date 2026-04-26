import { AlertCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChatStore, type ChatMessage } from "../../store/chatStore";
import { usePdfStore } from "../../store/pdfStore";
import { useChat } from "../../hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { ReadingModeSelector } from "./ReadingModeSelector";
import { api } from "../../lib/tauri";
import { useSettingsStore } from "../../store/settingsStore";

export function ChatPanel() {
  const paper = usePdfStore((s) => s.paper);
  const paperId = paper?.id ?? null;
  const messages = useChatStore((s) =>
    paperId ? s.messagesByPaper[paperId] ?? [] : [],
  );
  const isLoading = useChatStore((s) => s.isLoading);
  const clearChat = useChatStore((s) => s.clearChat);
  const setActivePaper = useChatStore((s) => s.setActivePaper);
  const setMessagesForPaper = useChatStore((s) => s.setMessagesForPaper);
  const { send } = useChat();
  const llmModel = useSettingsStore((s) => s.llmModel);
  const llmApiKey = useSettingsStore((s) => s.llmApiKey);
  const llmApiKeyLoaded = useSettingsStore((s) => s.llmApiKeyLoaded);
  const llmBaseUrl = useSettingsStore((s) => s.llmBaseUrl);
  const [input, setInput] = useState("");
  const [aiReady, setAiReady] = useState(true);
  const [aiReadinessDetail, setAiReadinessDetail] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep chat store in sync with the active paper.
  useEffect(() => {
    setActivePaper(paperId);
  }, [paperId, setActivePaper]);

  useEffect(() => {
    if (!paperId) return;

    let cancelled = false;
    api
      .getChatMessages(paperId)
      .then((records) => {
        if (cancelled) return;
        setMessagesForPaper(
          paperId,
          records.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: (m.sources ?? undefined) as ChatMessage["sources"],
            evidence: (m.evidence ?? undefined) as ChatMessage["evidence"],
            confidence: (m.confidence ?? undefined) as ChatMessage["confidence"],
            reading_mode: (m.reading_mode ?? undefined) as ChatMessage["reading_mode"],
            counterpoint: m.counterpoint ?? null,
            followup_question: m.followup_question ?? null,
            margin_note: m.margin_note ?? null,
            isStreaming: false,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setMessagesForPaper(paperId, []);
      });

    return () => {
      cancelled = true;
    };
  }, [paperId, setMessagesForPaper]);

  // Check sidecar health before allowing sends.
  useEffect(() => {
    if (!llmApiKeyLoaded) return;
    let cancelled = false;

    async function refreshReadiness() {
      try {
        const s = await api.checkAiReadiness();
        if (cancelled) return;
        setAiReady(s.ready);
        setAiReadinessDetail(s.ready ? null : s.detail);
      } catch (err) {
        if (cancelled) return;
        setAiReady(false);
        setAiReadinessDetail(String(err));
      }
    }

    void refreshReadiness();
    const retryId = window.setTimeout(() => void refreshReadiness(), 750);
    const intervalId = window.setInterval(() => void refreshReadiness(), 5000);
    return () => {
      cancelled = true;
      window.clearTimeout(retryId);
      window.clearInterval(intervalId);
    };
  }, [llmApiKey, llmApiKeyLoaded, llmBaseUrl, llmModel]);

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

  async function onClearChat() {
    if (!paperId) return;
    clearChat();
    try {
      await api.clearChatMessages(paperId);
    } catch (err) {
      console.warn("failed to clear persisted chat", err);
    }
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
          {aiReadinessDetail ?? "AI provider is not ready."}
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
        <form onSubmit={onSubmit} className="flex items-center gap-1.5 p-2">
          <textarea
            className="q-input flex-1 h-[38px] min-h-[38px] max-h-32 resize-none text-sm leading-5"
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
            disabled={isLoading || !aiReady || !input.trim()}
            className="q-btn-primary h-[38px] min-h-[38px] w-[38px] min-w-[38px] p-0 justify-center disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              className="q-btn h-[38px] min-h-[38px] w-[38px] min-w-[38px] p-0 justify-center text-text-muted hover:text-accent-error"
              onClick={onClearChat}
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
