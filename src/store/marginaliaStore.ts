import { create } from "zustand";

export type NoteType = "restatement" | "assumption" | "contradiction" | "connection" | "limitation";

export type MarginaliaNote = {
  id: string;
  page: number;
  paragraph_index: number;
  type: NoteType;
  note_text: string;
  ref_page?: number | null;
  is_edited?: boolean;
  edited_text?: string | null;
};

type MarginaliaState = {
  notes: MarginaliaNote[];
  visible: boolean;
  filterType: NoteType | null;
  isGenerating: boolean;

  setNotes: (notes: MarginaliaNote[]) => void;
  addNote: (note: MarginaliaNote) => void;
  setVisible: (v: boolean) => void;
  setFilterType: (t: NoteType | null) => void;
  setGenerating: (v: boolean) => void;
  clear: () => void;
};

export const useMarginaliaStore = create<MarginaliaState>((set) => ({
  notes: [],
  visible: true,
  filterType: null,
  isGenerating: false,

  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
  setVisible: (v) => set({ visible: v }),
  setFilterType: (t) => set({ filterType: t }),
  setGenerating: (v) => set({ isGenerating: v }),
  clear: () => set({ notes: [], isGenerating: false }),
}));
