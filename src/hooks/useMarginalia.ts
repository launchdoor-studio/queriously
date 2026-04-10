import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { api } from "../lib/tauri";
import { useMarginaliaStore, type MarginaliaNote } from "../store/marginaliaStore";
import { usePdfStore } from "../store/pdfStore";

/**
 * Loads existing marginalia on paper open, listens for progressive note
 * events during generation, and exposes a trigger to start generation.
 */
export function useMarginalia() {
  const paper = usePdfStore((s) => s.paper);
  const setNotes = useMarginaliaStore((s) => s.setNotes);
  const addNote = useMarginaliaStore((s) => s.addNote);
  const setGenerating = useMarginaliaStore((s) => s.setGenerating);
  const clear = useMarginaliaStore((s) => s.clear);

  // Load existing notes when paper changes.
  useEffect(() => {
    if (!paper) {
      clear();
      return;
    }
    api
      .getMarginalia(paper.id)
      .then((raw) => setNotes(raw as MarginaliaNote[]))
      .catch(() => setNotes([]));
  }, [paper?.id]);

  // Listen for progressive note events.
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    listen<{ paper_id: string; note: MarginaliaNote }>("marginalia:note", (e) => {
      if (e.payload.paper_id === paper?.id) {
        addNote(e.payload.note);
      }
    }).then((u) => unsubs.push(u));

    listen<{ paper_id: string }>("marginalia:complete", (e) => {
      if (e.payload.paper_id === paper?.id) {
        setGenerating(false);
      }
    }).then((u) => unsubs.push(u));

    return () => unsubs.forEach((u) => u());
  }, [paper?.id, addNote, setGenerating]);

  function generate() {
    if (!paper) return;
    setGenerating(true);
    api
      .generateMarginalia(paper.id, paper.file_path)
      .catch((err) => {
        console.error("marginalia generation failed:", err);
        setGenerating(false);
      });
  }

  return { generate };
}
