import { useEffect, useRef } from "react";
import { api } from "../lib/tauri";
import { usePdfStore } from "../store/pdfStore";

/**
 * Tracks reading progress per spec §8.9: a visibility/focus observer
 * increments time_spent_secs for each page the user has open. Flushes
 * the accumulated time to the Rust backend every 5 seconds.
 */
export function useReadingProgress() {
  const paper = usePdfStore((s) => s.paper);
  const currentPage = usePdfStore((s) => s.currentPage);
  const accRef = useRef<number>(0);
  const pageRef = useRef<number>(currentPage);
  const paperIdRef = useRef<string | null>(null);

  // Keep refs in sync.
  useEffect(() => {
    pageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    paperIdRef.current = paper?.id ?? null;
    accRef.current = 0;
  }, [paper?.id]);

  // Tick every second while document is focused.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hasFocus() && paperIdRef.current) {
        accRef.current += 1;
      }
    }, 1000);

    // Flush every 5 seconds.
    const flush = setInterval(() => {
      const pid = paperIdRef.current;
      const delta = accRef.current;
      if (pid && delta > 0) {
        accRef.current = 0;
        api
          .updateReadingProgress(pid, pageRef.current, delta)
          .catch(() => {});
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(flush);
    };
  }, []);
}
