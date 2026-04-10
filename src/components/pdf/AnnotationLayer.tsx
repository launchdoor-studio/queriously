import { useAnnotationStore } from "../../store/annotationStore";

type Props = {
  page: number;
};

/**
 * Overlay for user highlight annotations on a single PDF page.
 * Each highlight is rendered as a semi-transparent coloured rectangle
 * positioned via the stored normalized PDF-space coords (0-1).
 * The page container must be `position: relative` and have a known size.
 */
export function AnnotationLayer({ page }: Props) {
  const annotations = useAnnotationStore((s) => s.annotations);
  const pageAnnotations = annotations.filter(
    (a) => a.page === page && a.type === "highlight",
  );

  if (pageAnnotations.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {pageAnnotations.map((a) => {
        let coords: number[];
        try {
          coords = JSON.parse(a.coords);
        } catch {
          return null;
        }
        const [x1, y1, x2, y2] = coords;
        return (
          <div
            key={a.id}
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              left: `${x1 * 100}%`,
              top: `${y1 * 100}%`,
              width: `${(x2 - x1) * 100}%`,
              height: `${(y2 - y1) * 100}%`,
              backgroundColor: a.color || "#FEF08A",
              opacity: 0.3,
              borderRadius: 2,
            }}
            title={a.note_text || a.selected_text || "Highlight"}
          />
        );
      })}
    </div>
  );
}
