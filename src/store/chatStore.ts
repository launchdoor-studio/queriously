import { create } from "zustand";

export type ReadingMode = "explain" | "challenge" | "connect" | "annotate";
export type Confidence = "low" | "medium" | "high";
export type EvidenceLevel = "none" | "weak" | "partial" | "strong";

export type Source = {
  paper_id: string;
  page: number;
  section: string | null;
  text: string;
  score: number;
};

export type Evidence = {
  level: EvidenceLevel;
  label: string;
  reason: string;
  answerable: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  confidence?: Confidence;
  evidence?: Evidence | null;
  counterpoint?: string | null;
  followup_question?: string | null;
  margin_note?: string | null;
  reading_mode?: ReadingMode;
  isStreaming?: boolean;
};

type ChatState = {
  /** Messages keyed by paper ID */
  messagesByPaper: Record<string, ChatMessage[]>;
  readingMode: ReadingMode;
  isLoading: boolean;
  activePaperId: string | null;

  setActivePaper: (paperId: string | null) => void;
  setMessagesForPaper: (paperId: string, messages: ChatMessage[]) => void;
  setReadingMode: (mode: ReadingMode) => void;
  addMessage: (msg: ChatMessage) => void;
  appendToken: (id: string, token: string) => void;
  finalizeMessage: (id: string, data: Partial<ChatMessage>) => void;
  setLoading: (v: boolean) => void;
  clearChat: () => void;

  /** Convenience getter for the active paper's messages */
  messages: ChatMessage[];
};

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByPaper: {},
  readingMode: "explain",
  isLoading: false,
  activePaperId: null,

  get messages() {
    const { activePaperId, messagesByPaper } = get();
    return activePaperId ? messagesByPaper[activePaperId] ?? [] : [];
  },

  setActivePaper: (paperId) => set({ activePaperId: paperId }),

  setMessagesForPaper: (paperId, messages) =>
    set((s) => ({
      messagesByPaper: {
        ...s.messagesByPaper,
        [paperId]: messages,
      },
    })),

  setReadingMode: (mode) => set({ readingMode: mode }),

  addMessage: (msg) =>
    set((s) => {
      const pid = s.activePaperId;
      if (!pid) return s;
      const existing = s.messagesByPaper[pid] ?? [];
      return {
        messagesByPaper: {
          ...s.messagesByPaper,
          [pid]: [...existing, msg],
        },
      };
    }),

  appendToken: (id, token) =>
    set((s) => {
      const pid = s.activePaperId;
      if (!pid) return s;
      const msgs = s.messagesByPaper[pid];
      if (!msgs) return s;
      return {
        messagesByPaper: {
          ...s.messagesByPaper,
          [pid]: msgs.map((m) =>
            m.id === id ? { ...m, content: m.content + token } : m,
          ),
        },
      };
    }),

  finalizeMessage: (id, data) =>
    set((s) => {
      const pid = s.activePaperId;
      if (!pid) return s;
      const msgs = s.messagesByPaper[pid];
      if (!msgs) return s;
      return {
        messagesByPaper: {
          ...s.messagesByPaper,
          [pid]: msgs.map((m) =>
            m.id === id ? { ...m, ...data, isStreaming: false } : m,
          ),
        },
      };
    }),

  setLoading: (v) => set({ isLoading: v }),

  clearChat: () =>
    set((s) => {
      const pid = s.activePaperId;
      if (!pid) return s;
      const { [pid]: _, ...rest } = s.messagesByPaper;
      return { messagesByPaper: rest };
    }),
}));
