import { FileText, Trash2 } from "lucide-react";
import type { Paper } from "../../lib/tauri";
import { cn } from "../../lib/utils";

type Props = {
  paper: Paper;
  active?: boolean;
  onOpen: () => void;
  onRemove: () => void;
};

export function PaperCard({ paper, active, onOpen, onRemove }: Props) {
  return (
    <div
      className={cn(
        "group flex gap-2 px-3 py-2 cursor-pointer border-b border-surface-border",
        "hover:bg-surface-overlay transition-colors",
        active && "bg-surface-overlay",
      )}
      onClick={onOpen}
    >
      <FileText className="w-4 h-4 mt-0.5 shrink-0 text-text-muted" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">
          {paper.title ?? paper.file_path.split("/").pop()}
        </div>
        <div className="text-[11px] text-text-muted truncate">
          {paper.is_indexed ? "Indexed" : "Not indexed"}
          {paper.marginalia_done ? " · Marginalia" : ""}
        </div>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent-error"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove from library"
        title="Remove from library"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
