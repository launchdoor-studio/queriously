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

export const api = {
  openPdf: (path: string) => invoke<Paper>("open_pdf", { path }),
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
};
