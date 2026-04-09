import { readFile } from "@tauri-apps/plugin-fs";
import { loadPdfFromBytes } from "../lib/pdfjs";
import { api, type Paper } from "../lib/tauri";
import { useLibraryStore } from "../store/libraryStore";
import { usePdfStore } from "../store/pdfStore";

/**
 * Open a PDF end-to-end: register it with the Rust library, read the file
 * bytes through the Tauri FS plugin, load the document into pdfjs, and push
 * it into both the pdf store (so the viewer renders) and the library store
 * (so the sidebar reflects the most-recently-opened ordering).
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
    return paper;
  }

  return { openPath };
}
