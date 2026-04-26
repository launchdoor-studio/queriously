/**
 * Typed wrappers around Tauri invoke commands. Keeps the payload shapes in
 * one place so the React components don't re-declare them.
 */
import { invoke } from "@tauri-apps/api/core";

export type Paper = {
  id: string;
  file_path: string;
  title: string | null;
  authors: string | null;
  year: number | null;
  page_count: number | null;
  date_added: number;
  last_opened: number | null;
  is_indexed: boolean;
  marginalia_done: boolean;
};

export type SidecarStatus = {
  ready: boolean;
  port: number | null;
  health: string | null;
};

export type AiReadiness = {
  ready: boolean;
  status: string;
  detail: string;
  model: string;
};

export type IngestResult = {
  paper_id: string;
  chunk_count: number;
  equation_count: number;
  citation_count: number;
  metadata: {
    title: string | null;
    authors: string | null;
    abstract: string | null;
    year: number | null;
    page_count: number;
  };
};

export type Session = {
  id: string;
  name: string;
  research_question: string;
  created_at: number;
  updated_at: number | null;
  paper_count: number;
};

export type ChatMessageRecord = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: unknown[] | null;
  evidence?: unknown | null;
  reading_mode?: string | null;
  selection_text?: string | null;
  confidence?: string | null;
  counterpoint?: string | null;
  followup_question?: string | null;
  margin_note?: string | null;
  created_at: number;
};

export const api = {
  openPdf: (path: string) => invoke<Paper>("open_pdf", { path }),
  readPdfBytes: (path: string) => invoke<number[]>("read_pdf_bytes", { path }),
  getLibrary: () => invoke<Paper[]>("get_library"),
  deletePaper: (paperId: string, deleteAnnotations: boolean) =>
    invoke<void>("delete_paper", { paperId, deleteAnnotations }),
  ingestPaper: (paperId: string, filePath: string) =>
    invoke<IngestResult>("ingest_paper", { paperId, filePath }),
  summarizePaper: (paperId: string, mode: string, scope: string, content?: string) =>
    invoke<string>("summarize_paper", { paperId, mode, scope, content: content ?? null }),
  generateMarginalia: (paperId: string, filePath: string) =>
    invoke<void>("generate_marginalia", { paperId, filePath }),
  getMarginalia: (paperId: string) =>
    invoke<any[]>("get_marginalia", { paperId }),
  updateReadingProgress: (paperId: string, page: number, deltaSecs: number) =>
    invoke<void>("update_reading_progress", { paperId, page, deltaSecs }),
  getReadingProgress: (paperId: string) =>
    invoke<{ page_number: number; time_spent_secs: number }[]>("get_reading_progress", { paperId }),
  saveAnnotation: (annotation: any) =>
    invoke<any>("save_annotation", { annotation }),
  getAnnotations: (paperId: string) =>
    invoke<any[]>("get_annotations", { paperId }),
  deleteAnnotation: (id: string) =>
    invoke<void>("delete_annotation", { id }),
  sidecarStatus: () => invoke<SidecarStatus>("sidecar_status"),
  getChatMessages: (paperId: string) =>
    invoke<ChatMessageRecord[]>("get_chat_messages", { paperId }),
  saveChatMessage: (message: {
    id: string;
    paper_id: string;
    chat_session_id: string;
    role: "user" | "assistant";
    content: string;
    sources?: unknown[] | null;
    evidence?: unknown | null;
    reading_mode?: string | null;
    selection_text?: string | null;
    confidence?: string | null;
    counterpoint?: string | null;
    followup_question?: string | null;
    margin_note?: string | null;
  }) => invoke<void>("save_chat_message", { message }),
  clearChatMessages: (paperId: string) =>
    invoke<void>("clear_chat_messages", { paperId }),
  updateLlmConfig: (config: { model: string; api_key?: string | null; base_url?: string | null }) =>
    invoke<void>("update_llm_config", { config }),
  getLlmApiKey: () =>
    invoke<string | null>("get_llm_api_key"),
  setLlmApiKey: (apiKey?: string | null) =>
    invoke<void>("set_llm_api_key", { apiKey: apiKey ?? null }),
  checkOllama: () =>
    invoke<{ running: boolean; models: string[] }>("check_ollama"),
  checkAiReadiness: () =>
    invoke<AiReadiness>("check_ai_readiness"),
  getSessions: () =>
    invoke<Session[]>("get_sessions"),
  createSession: (name: string, researchQuestion: string) =>
    invoke<Session>("create_session", { name, researchQuestion }),
  addPaperToSession: (sessionId: string, paperId: string) =>
    invoke<void>("add_paper_to_session", { sessionId, paperId }),
};
