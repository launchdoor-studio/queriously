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

export const api = {
  openPdf: (path: string) => invoke<Paper>("open_pdf", { path }),
  getLibrary: () => invoke<Paper[]>("get_library"),
  deletePaper: (paperId: string, deleteAnnotations: boolean) =>
    invoke<void>("delete_paper", { paperId, deleteAnnotations }),
  sidecarStatus: () => invoke<SidecarStatus>("sidecar_status"),
};
