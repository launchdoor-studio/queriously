import { AlertTriangle, Info, Link2, MessageCircle, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { NoteType } from "../../store/marginaliaStore";
import { cn } from "../../lib/utils";

type Props = {
  type: NoteType;
  text: string;
  refPage?: number | null;
  onJumpToPage?: (page: number) => void;
};

const typeConfig: Record<NoteType, { icon: React.ReactNode; color: string; label: string }> = {
  restatement: {
    icon: <MessageCircle className="w-3 h-3" />,
    color: "text-text-secondary bg-text-secondary/10",
    label: "Restatement",
  },
  assumption: {
    icon: <AlertTriangle className="w-3 h-3" />,
    color: "text-accent-warning bg-accent-warning/10",
    label: "Assumption",
  },
  contradiction: {
    icon: <ShieldAlert className="w-3 h-3" />,
    color: "text-accent-primary bg-accent-primary/10",
    label: "Contradiction",
  },
  connection: {
    icon: <Link2 className="w-3 h-3" />,
    color: "text-blue-400 bg-blue-400/10",
    label: "Connection",
  },
  limitation: {
    icon: <Info className="w-3 h-3" />,
    color: "text-orange-400 bg-orange-400/10",
    label: "Limitation",
  },
};

export function MarginaliaNoteCard({ type, text, refPage, onJumpToPage }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cfg = typeConfig[type] || typeConfig.restatement;
  const truncated = text.length > 60 ? text.slice(0, 57) + "..." : text;

  return (
    <div
      className={cn(
        "group flex items-start gap-1.5 px-2 py-1.5 rounded-md cursor-pointer",
        "text-xs transition-colors hover:bg-surface-overlay",
        cfg.color,
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <span className="shrink-0 mt-0.5">{cfg.icon}</span>
      <div className="min-w-0 flex-1">
        {expanded ? (
          <div>
            <div className="font-medium mb-0.5">{cfg.label}</div>
            <div className="text-text-primary">{text}</div>
            {refPage && onJumpToPage && (
              <button
                className="text-accent-primary hover:underline mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToPage(refPage);
                }}
              >
                See p.{refPage}
              </button>
            )}
          </div>
        ) : (
          <span>{truncated}</span>
        )}
      </div>
    </div>
  );
}
