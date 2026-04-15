import { useCallback, useEffect, useRef } from "react";
import { usePdfStore } from "../../store/pdfStore";
import { PdfPage } from "./PdfPage";

/**
 * Viewer shell: scrolls through every page of the active document. Each page
 * is mounted in DOM order so native text selection can span pages; rendering
 * is gated by an intersection observer inside PdfPage so only visible pages
 * pay the pdfjs render cost.
 *
 * Selection strategy: we rely on the browser's native ::selection highlight
 * through the pdfjs text layer. On mouseup we read the selected text and
 * bounding rect into the store so the FloatingToolbar can position itself.
 * The native selection stays visible — no custom overlay rects needed.
 */
export function PDFViewer() {
  const paper = usePdfStore((s) => s.paper);
  const doc = usePdfStore((s) => s.doc);
  const pageCount = usePdfStore((s) => s.pageCount);
  const zoom = usePdfStore((s) => s.zoom);
  const setCurrentPage = usePdfStore((s) => s.setCurrentPage);
  const currentPage = usePdfStore((s) => s.currentPage);
  const setZoom = usePdfStore((s) => s.setZoom);
  const setSelection = usePdfStore((s) => s.setSelection);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onPageVisible = useCallback(
    (p: number) => setCurrentPage(p),
    [setCurrentPage],
  );

  // Scroll to top when a new paper is loaded.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [paper?.id]);

  // Keyboard shortcuts per FR-PDF-09: j/k + arrows for page nav.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        jumpTo(currentPage + 1);
        e.preventDefault();
      } else if (e.key === "k" || e.key === "ArrowUp") {
        jumpTo(currentPage - 1);
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "=") {
        setZoom(zoom + 0.1);
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        setZoom(zoom - 0.1);
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, zoom]);

  function jumpTo(page: number) {
    if (!scrollRef.current) return;
    const clamped = Math.min(Math.max(1, page), pageCount);
    const el = scrollRef.current.querySelector<HTMLElement>(
      `[data-page="${clamped}"]`,
    );
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Selection handling: read native selection on mouseup, store text + rect.
  // The browser's ::selection CSS handles the visual highlight — we never
  // replace it with custom overlay divs.
  useEffect(() => {
    function findPage(node: Node | null): number {
      let el: HTMLElement | null =
        node instanceof HTMLElement ? node : node?.parentElement ?? null;
      while (el && !el.dataset.page) el = el.parentElement;
      return el ? Number(el.dataset.page) : 1;
    }

    function onMouseUp() {
      // Small delay so the browser finalizes the selection range.
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          return; // don't clear — might be a click on the toolbar
        }
        const text = sel.toString().trim();
        if (!text) return;

        const range = sel.getRangeAt(0);
        // Ignore selections outside the viewer.
        if (
          scrollRef.current &&
          !scrollRef.current.contains(range.commonAncestorContainer)
        ) {
          return;
        }

        const rect = range.getBoundingClientRect();
        const page = findPage(range.startContainer);
        setSelection({ text, page, rect });
      });
    }

    function onMouseDown(e: MouseEvent) {
      // If clicking inside the viewer (but not on the toolbar), clear selection.
      const target = e.target as HTMLElement;
      if (target.closest("[data-floating-toolbar]")) return;
      if (scrollRef.current && scrollRef.current.contains(target)) {
        setSelection(null);
      }
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [setSelection]);

  if (!doc) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-text-muted gap-3">
        <div className="text-4xl opacity-30">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <p className="text-sm">Drop a PDF here or press <kbd className="px-1.5 py-0.5 rounded bg-surface-overlay text-text-secondary text-xs font-mono">⌘O</kbd> to open</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-auto bg-surface-base pb-24"
    >
      {Array.from({ length: pageCount }, (_, i) => (
        <PdfPage
          key={`${paper?.id ?? "doc"}-${i + 1}`}
          doc={doc}
          pageNumber={i + 1}
          zoom={zoom}
          onVisible={onPageVisible}
        />
      ))}
    </div>
  );
}
