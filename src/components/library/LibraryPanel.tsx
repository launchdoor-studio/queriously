import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLibraryStore } from "../../store/libraryStore";
import { usePdfStore } from "../../store/pdfStore";
import { usePdf } from "../../hooks/usePdf";
import { PaperCard } from "./PaperCard";

/**
 * Minimal local library per spec §8.10: a flat recency-sorted list of papers
 * with client-side search by title. Clicking a card re-opens the paper in
 * the viewer; the delete button removes it from the list (annotations are
 * preserved unless the Remove dialog asks for cascade — Phase 1 keeps that
 * simple and always preserves annotations).
 */
export function LibraryPanel() {
  const papers = useLibraryStore((s) => s.papers);
  const refresh = useLibraryStore((s) => s.refresh);
  const remove = useLibraryStore((s) => s.remove);
  const activePaper = usePdfStore((s) => s.paper);
  const { openPath } = usePdf();
  const [query, setQuery] = useState("");

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return papers;
    return papers.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.authors?.toLowerCase().includes(q) ||
        p.file_path.toLowerCase().includes(q),
    );
  }, [papers, query]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-surface-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            className="q-input w-full pl-7 py-1 text-xs"
            placeholder="Search library"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs p-4 text-center">
            {papers.length === 0
              ? "Open a PDF to start your library."
              : "No papers match that search."}
          </div>
        ) : (
          filtered.map((p) => (
            <PaperCard
              key={p.id}
              paper={p}
              active={activePaper?.id === p.id}
              onOpen={() => {
                openPath(p.file_path).catch(console.error);
              }}
              onRemove={() => {
                remove(p.id, false).catch(console.error);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
