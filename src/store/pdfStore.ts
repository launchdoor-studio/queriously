import { create } from "zustand";
import type { PdfDoc } from "../lib/pdfjs";
import type { Paper } from "../lib/tauri";

export type Selection = {
  text: string;
  page: number;
  /** Bounding rect for toolbar positioning; null while still dragging */
  rect: DOMRect | null;
};

type PdfState = {
  paper: Paper | null;
  doc: PdfDoc | null;
  pageCount: number;
  currentPage: number;
  zoom: number; // 1.0 == 100%
  selection: Selection | null;

  setPaper: (paper: Paper | null) => void;
  setDoc: (doc: PdfDoc | null, pageCount: number) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setSelection: (selection: Selection | null) => void;
};

export const usePdfStore = create<PdfState>((set) => ({
  paper: null,
  doc: null,
  pageCount: 0,
  currentPage: 1,
  zoom: 1.2,
  selection: null,

  setPaper: (paper) => set({ paper }),
  setDoc: (doc, pageCount) => set({ doc, pageCount, currentPage: 1 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.1, zoom)) }),
  setSelection: (selection) => set({ selection }),
}));
