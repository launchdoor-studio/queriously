import { create } from "zustand";
import { api, type Paper } from "../lib/tauri";

type LibraryState = {
  papers: Paper[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (paperId: string, deleteAnnotations: boolean) => Promise<void>;
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  papers: [],
  loading: false,

  async refresh() {
    set({ loading: true });
    try {
      const papers = await api.getLibrary();
      set({ papers });
    } finally {
      set({ loading: false });
    }
  },

  async remove(paperId, deleteAnnotations) {
    await api.deletePaper(paperId, deleteAnnotations);
    await get().refresh();
  },
}));
