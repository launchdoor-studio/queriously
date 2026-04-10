/**
 * Central pdfjs-dist bootstrap. We load the worker from a URL import so Vite
 * bundles it correctly, and we expose a thin helper to load PDFs from either
 * a file path (Tauri FS plugin) or an ArrayBuffer/Uint8Array.
 */
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker as string;

export type PdfDoc = pdfjsLib.PDFDocumentProxy;
export type PdfPage = pdfjsLib.PDFPageProxy;

export async function loadPdfFromBytes(data: Uint8Array): Promise<PdfDoc> {
  const task = pdfjsLib.getDocument({ data });
  return task.promise;
}

export { pdfjsLib };
