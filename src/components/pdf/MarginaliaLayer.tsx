import { useMarginaliaStore } from "../../store/marginaliaStore";
import { MarginaliaNoteCard } from "../marginalia/MarginaliaNote";

type Props = {
  page: number;
};

/**
 * Right-gutter overlay for a single PDF page. Renders all margin notes
 * assigned to this page as compact pills, vertically spaced by paragraph
 * index. Positioned absolutely inside the page container — does not
 * overlay the paper text (spec §FR-MAR-07).
 */
export function MarginaliaLayer({ page }: Props) {
  const notes = useMarginaliaStore((s) => s.notes);
  const visible = useMarginaliaStore((s) => s.visible);
  const filterType = useMarginaliaStore((s) => s.filterType);

  if (!visible) return null;

  const pageNotes = notes.filter(
    (n) =>
      n.page === page &&
      (filterType === null || n.type === filterType),
  );

  if (pageNotes.length === 0) return null;

  function jumpToPage(p: number) {
    const el = document.querySelector<HTMLElement>(`[data-page="${p}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className="absolute top-0 right-0 w-52 flex flex-col gap-1 py-2 pr-1"
      style={{ transform: "translateX(100%)" }}
    >
      {pageNotes.map((n) => (
        <MarginaliaNoteCard
          key={n.id}
          type={n.type}
          text={n.is_edited && n.edited_text ? n.edited_text : n.note_text}
          refPage={n.ref_page}
          onJumpToPage={jumpToPage}
        />
      ))}
    </div>
  );
}
