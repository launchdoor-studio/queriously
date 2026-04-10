import { create } from "zustand";

type SummaryState = {
  /** paper_id → summary content */
  summaries: Record<string, string>;
  loadingPaperId: string | null;

  setContent: (paperId: string, content: string) => void;
  appendToken: (paperId: string, token: string) => void;
  setLoading: (paperId: string | null) => void;
  clear: (paperId: string) => void;
};

export const useSummaryStore = create<SummaryState>((set) => ({
  summaries: {},
  loadingPaperId: null,

  setContent: (paperId, content) =>
    set((s) => ({ summaries: { ...s.summaries, [paperId]: content } })),
  appendToken: (paperId, token) =>
    set((s) => ({
      summaries: {
        ...s.summaries,
        [paperId]: (s.summaries[paperId] || "") + token,
      },
    })),
  setLoading: (paperId) => set({ loadingPaperId: paperId }),
  clear: (paperId) =>
    set((s) => {
      const { [paperId]: _, ...rest } = s.summaries;
      return { summaries: rest };
    }),
}));
