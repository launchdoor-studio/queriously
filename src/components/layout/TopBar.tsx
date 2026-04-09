import { FolderOpen, Moon, Settings2, Sun } from "lucide-react";
import { Logo } from "../ui/Logo";
import { useSettingsStore } from "../../store/settingsStore";
import { usePdfStore } from "../../store/pdfStore";

type Props = {
  onOpen: () => void;
  onSettings?: () => void;
};

export function TopBar({ onOpen, onSettings }: Props) {
  const paper = usePdfStore((s) => s.paper);
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  return (
    <header className="h-11 shrink-0 flex items-center px-3 border-b border-surface-border bg-surface-raised">
      <div className="flex items-center gap-2 pr-3 border-r border-surface-border">
        <Logo size={20} className="text-accent-primary" />
        <span className="font-semibold tracking-tight">Queriously</span>
      </div>
      <div className="mx-3 text-text-secondary truncate">
        {paper?.title ?? "No paper open"}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button className="q-btn" onClick={onOpen} title="Open PDF">
          <FolderOpen className="w-4 h-4" />
          <span>Open</span>
        </button>
        <button
          className="q-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <button
          className="q-btn"
          onClick={onSettings}
          title="Settings"
          aria-label="Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
