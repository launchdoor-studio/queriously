import { create } from "zustand";
import { api } from "../lib/tauri";

export type Annotation = {
  id: string;
  paper_id: string;
  session_id: string | null;
  page: number;
  coords: string; // JSON [x1, y1, x2, y2]
  type: "highlight" | "sticky";
  color: string | null;
  selected_text: string | null;
  note_text: string | null;
  created_at: number;
  updated_at: number | null;
};

export const HIGHLIGHT_COLORS = [
  { name: "yellow", value: "#FEF08A" },
  { name: "green", value: "#BBF7D0" },
  { name: "blue", value: "#BAE6FD" },
  { name: "pink", value: "#FBCFE8" },
  { name: "orange", value: "#FED7AA" },
];

type AnnotationState = {
  annotations: Annotation[];
  activeColor: string;

  setAnnotations: (a: Annotation[]) => void;
  setActiveColor: (c: string) => void;
  load: (paperId: string) => Promise<void>;
  add: (a: Annotation) => Promise<Annotation>;
  remove: (id: string) => Promise<void>;
};

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  activeColor: HIGHLIGHT_COLORS[0].value,

  setAnnotations: (a) => set({ annotations: a }),
  setActiveColor: (c) => set({ activeColor: c }),

  async load(paperId) {
    try {
      const raw = await api.getAnnotations(paperId);
      set({ annotations: raw as Annotation[] });
    } catch {
      set({ annotations: [] });
    }
  },

  async add(a) {
    const result = await api.saveAnnotation(a);
    set((s) => ({ annotations: [...s.annotations, result as Annotation] }));
    return result as Annotation;
  },

  async remove(id) {
    await api.deleteAnnotation(id);
    set((s) => ({
      annotations: s.annotations.filter((a) => a.id !== id),
    }));
  },
}));
