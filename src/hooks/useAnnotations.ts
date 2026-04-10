import { useEffect } from "react";
import { useAnnotationStore } from "../store/annotationStore";
import { usePdfStore } from "../store/pdfStore";

/**
 * Loads annotations from the backend whenever the active paper changes.
 */
export function useAnnotations() {
  const paper = usePdfStore((s) => s.paper);
  const load = useAnnotationStore((s) => s.load);

  useEffect(() => {
    if (paper) {
      load(paper.id);
    }
  }, [paper, load]);
}
