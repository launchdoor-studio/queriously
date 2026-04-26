import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitMerge,
  User,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage, EvidenceLevel } from "../../store/chatStore";
import { cn } from "../../lib/utils";
import { SourceCitation } from "./SourceCitation";

type Props = {
  message: ChatMessage;
  onJumpToPage?: (page: number) => void;
};

const evidenceIcon: Record<EvidenceLevel, React.ReactNode> = {
  none: <AlertCircle className="w-3.5 h-3.5 text-accent-error" />,
  weak: <AlertCircle className="w-3.5 h-3.5 text-accent-warning" />,
  partial: <AlertCircle className="w-3.5 h-3.5 text-text-muted" />,
  strong: <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />,
};

const fallbackEvidence: NonNullable<ChatMessage["evidence"]> = {
  level: "partial",
  label: "Sources",
  reason: "Source passages were retrieved for this answer.",
  answerable: true,
};

export function MessageBubble({ message, onJumpToPage }: Props) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs",
          isUser ? "bg-accent-primary/20 text-accent-primary" : "bg-surface-overlay text-text-secondary",
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : "Q"}
      </div>

      <div className={cn("min-w-0 max-w-[85%] flex flex-col gap-1.5", isUser && "items-end")}>
        <div
          className={cn(
            "px-3 py-2 rounded-lg text-sm leading-relaxed",
            isUser
              ? "bg-accent-primary/15 text-text-primary"
              : "bg-surface-overlay text-text-primary",
          )}
        >
          {message.isStreaming && !message.content ? (
            <span className="text-text-muted animate-pulse">Thinking...</span>
          ) : (
            <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none
                         prose-p:my-1 prose-li:my-0.5 prose-headings:text-text-primary
                         prose-strong:text-text-primary prose-code:text-accent-secondary
                         prose-code:bg-surface-base prose-code:px-1 prose-code:rounded"
            >
              {message.content}
            </ReactMarkdown>
          )}
          {message.isStreaming && message.content && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-accent-primary animate-pulse rounded-sm" />
          )}
        </div>

        {/* Counterpoint block (Challenge mode) */}
        {message.counterpoint && (
          <div className="flex gap-2 px-3 py-2 rounded-lg bg-accent-warning/10 border-l-2 border-accent-warning text-xs">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent-warning" />
            <div>
              <div className="font-medium text-accent-warning mb-0.5">From the paper's own limitations</div>
              <div className="text-text-secondary">{message.counterpoint}</div>
            </div>
          </div>
        )}

        {/* Follow-up (Connect mode) */}
        {message.followup_question && (
          <div className="flex gap-2 px-3 py-2 rounded-lg bg-accent-secondary/10 border-l-2 border-accent-secondary text-xs">
            <GitMerge className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent-secondary" />
            <div>
              <div className="font-medium text-accent-secondary mb-0.5">Your turn</div>
              <div className="text-text-secondary">{message.followup_question}</div>
            </div>
          </div>
        )}

        {/* Evidence + sources toggle */}
        {!isUser && !message.isStreaming && (message.evidence || message.sources?.length) && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            {evidenceIcon[(message.evidence ?? fallbackEvidence).level]}
            <span title={(message.evidence ?? fallbackEvidence).reason}>
              {(message.evidence ?? fallbackEvidence).label}
            </span>
            {message.sources && message.sources.length > 0 && (
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-0.5 hover:text-text-secondary transition-colors"
              >
                {showSources ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {message.sources.length} source{message.sources.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}

        {showSources && message.sources && (
          <div className="flex flex-col gap-1.5 w-full">
            {message.sources.map((s, i) => (
              <SourceCitation key={i} source={s} onJump={onJumpToPage} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
