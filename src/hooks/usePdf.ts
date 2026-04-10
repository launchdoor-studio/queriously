import { readFile } from "@tauri-apps/plugin-fs";
import { loadPdfFromBytes } from "../lib/pdfjs";
import { api, type Paper } from "../lib/tauri";
import { useLibraryStore } from "../store/libraryStore";
import { useMarginaliaStore } from "../store/marginaliaStore";
import { usePdfStore } from "../store/pdfStore";

export function usePdf() {
  const setDoc = usePdfStore((s) => s.setDoc);
  const setPaper = usePdfStore((s) => s.setPaper);
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const setMargGenerating = useMarginaliaStore((s) => s.setGenerating);

  async function openPath(path: string): Promise<Paper> {
    const paper = await api.openPdf(path);
    const bytes = await readFile(path);
    const doc = await loadPdfFromBytes(new Uint8Array(bytes));
    setPaper(paper);
    setDoc(doc, doc.numPages);
    void refreshLibrary();

    // Auto-ingest if not already indexed, then trigger marginalia.
    if (!paper.is_indexed) {
      api
        .ingestPaper(paper.id, path)
        .then(() => {
          void refreshLibrary();
          if (!paper.marginalia_done) {
            setMargGenerating(true);
            api
              .generateMarginalia(paper.id, path)
              .catch((err) => console.warn("marginalia failed:", err));
          }
        })
        .catch((err) => console.warn("ingest failed (will retry):", err));
    } else if (!paper.marginalia_done) {
      // Indexed but marginalia not yet generated.
      setMargGenerating(true);
      api
        .generateMarginalia(paper.id, path)
        .catch((err) => console.warn("marginalia failed:", err));
    }

    return paper;
  }

  return { openPath };
}
