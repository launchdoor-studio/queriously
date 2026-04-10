import { readFile } from "@tauri-apps/plugin-fs";
import { loadPdfFromBytes } from "../lib/pdfjs";
import { api, type Paper } from "../lib/tauri";
import { useLibraryStore } from "../store/libraryStore";
import { usePdfStore } from "../store/pdfStore";

/**
 * Open a PDF end-to-end: register it with the Rust library, read the file
 * bytes through the Tauri FS plugin, load the document into pdfjs, and push
 * it into both the pdf store and the library store. Then kick off the AI
 * ingest pipeline (parse → chunk → embed → ChromaDB) in the background so
 * QA and marginalia become available without user action.
 */
export function usePdf() {
  const setDoc = usePdfStore((s) => s.setDoc);
  const setPaper = usePdfStore((s) => s.setPaper);
  const refreshLibrary = useLibraryStore((s) => s.refresh);

  async function openPath(path: string): Promise<Paper> {
    const paper = await api.openPdf(path);
    const bytes = await readFile(path);
    const doc = await loadPdfFromBytes(new Uint8Array(bytes));
    setPaper(paper);
    setDoc(doc, doc.numPages);
    void refreshLibrary();

    // Fire-and-forget: index the paper if not already done. The sidecar may
    // not be ready yet (first launch) — that's fine, the user can still read
    // and the ingest will be re-triggered later via the chat panel.
    if (!paper.is_indexed) {
      api
        .ingestPaper(paper.id, path)
        .then(() => refreshLibrary())
        .catch((err) => console.warn("ingest failed (will retry):", err));
    }

    return paper;
  }

  return { openPath };
}
