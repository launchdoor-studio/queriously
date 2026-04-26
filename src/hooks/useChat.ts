import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";
import { useChatStore, type ChatMessage } from "../store/chatStore";
import { usePdfStore } from "../store/pdfStore";
import { api } from "../lib/tauri";

/**
 * Manages the chat lifecycle: sends questions via the ask_question Tauri
 * command, listens for streamed token events and the final done payload,
 * and pushes everything into the chat store.
 */
export function useChat() {
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToken = useChatStore((s) => s.appendToken);
  const finalizeMessage = useChatStore((s) => s.finalizeMessage);
  const setLoading = useChatStore((s) => s.setLoading);
  const readingMode = useChatStore((s) => s.readingMode);
  const messagesByPaper = useChatStore((s) => s.messagesByPaper);
  const paper = usePdfStore((s) => s.paper);

  // Track the current streaming message id so event listeners can target it.
  const streamIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>("default");
  const paperIdRef = useRef<string | null>(null);
  const streamModeRef = useRef<typeof readingMode>("explain");

  useEffect(() => {
    const paperId = paper?.id ?? null;
    paperIdRef.current = paperId;
    sessionIdRef.current = paperId ? `paper:${paperId}` : "default";
  }, [paper?.id]);

  // Set up global Tauri event listeners once.
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    listen<{ chat_session_id: string; token: string }>("ai:token", (e) => {
      const id = streamIdRef.current;
      if (id && e.payload.chat_session_id === sessionIdRef.current) {
        appendToken(id, e.payload.token);
      }
    }).then((u) => unsubs.push(u));

    listen<{
      chat_session_id: string;
      answer: string;
      sources: any[];
      confidence: string;
      evidence?: ChatMessage["evidence"];
      counterpoint?: string | null;
      followup_question?: string | null;
      margin_note?: string | null;
    }>("ai:done", (e) => {
      const id = streamIdRef.current;
      if (id && e.payload.chat_session_id === sessionIdRef.current) {
        const finalMessage: Partial<ChatMessage> = {
          content: e.payload.answer || "",
          sources: e.payload.sources,
          confidence: e.payload.confidence as any,
          evidence: e.payload.evidence,
          counterpoint: e.payload.counterpoint,
          followup_question: e.payload.followup_question,
          margin_note: e.payload.margin_note,
        };
        finalizeMessage(id, finalMessage);
        const paperId = paperIdRef.current;
        if (paperId) {
          void api.saveChatMessage({
            id,
            paper_id: paperId,
            chat_session_id: sessionIdRef.current,
            role: "assistant",
            content: finalMessage.content ?? "",
            sources: finalMessage.sources ?? null,
            evidence: finalMessage.evidence ?? null,
            reading_mode: streamModeRef.current,
            selection_text: null,
            confidence: finalMessage.confidence ?? null,
            counterpoint: finalMessage.counterpoint ?? null,
            followup_question: finalMessage.followup_question ?? null,
            margin_note: finalMessage.margin_note ?? null,
          });
        }
        streamIdRef.current = null;
        setLoading(false);
      }
    }).then((u) => unsubs.push(u));

    listen<{ chat_session_id: string; error: string }>("ai:error", (e) => {
      if (e.payload.chat_session_id === sessionIdRef.current) {
        const id = streamIdRef.current;
        if (id) {
          finalizeMessage(id, { content: `Error: ${e.payload.error}` });
        }
        streamIdRef.current = null;
        setLoading(false);
      }
    }).then((u) => unsubs.push(u));

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [appendToken, finalizeMessage, setLoading]);

  async function send(
    question: string,
    contextOverride?: string,
  ) {
    if (!paper) return;
    const chatHistory = (messagesByPaper[paper.id] ?? [])
      .filter((m) => !m.isStreaming && m.content.trim())
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Add user message.
    const userId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userId,
      role: "user",
      content: question,
      reading_mode: readingMode,
    };
    addMessage(userMsg);
    void api.saveChatMessage({
      id: userId,
      paper_id: paper.id,
      chat_session_id: sessionIdRef.current,
      role: "user",
      content: question,
      sources: null,
      evidence: null,
      reading_mode: readingMode,
      selection_text: contextOverride ?? null,
      confidence: null,
      counterpoint: null,
      followup_question: null,
      margin_note: null,
    });

    // Prepare assistant placeholder.
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      reading_mode: readingMode,
      isStreaming: true,
    };
    addMessage(assistantMsg);
    streamIdRef.current = assistantId;
    streamModeRef.current = readingMode;
    setLoading(true);

    try {
      await invoke("ask_question", {
        question,
        paperId: paper.id,
        chatSessionId: sessionIdRef.current,
        readingMode: readingMode,
        contextPaperIds: [],
        contextOverride: contextOverride ?? null,
        chatHistory,
        topK: 5,
      });
    } catch (err) {
      finalizeMessage(assistantId, {
        content: `Failed to get response: ${err}`,
      });
      streamIdRef.current = null;
      setLoading(false);
    }
  }

  return { send };
}
