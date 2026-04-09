import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { LibraryPanel } from "./components/library/LibraryPanel";
import { RightPanel } from "./components/layout/RightPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { TopBar } from "./components/layout/TopBar";
import { PDFViewer } from "./components/pdf/PDFViewer";
import { usePdf } from "./hooks/usePdf";

function App() {
  const { openPath } = usePdf();

  async function onOpen() {
    const path = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof path === "string") {
      try {
        await openPath(path);
      } catch (err) {
        console.error(err);
      }
    }
  }

  // Native OS drag-and-drop: Tauri emits drop events with the raw file paths,
  // so we open the first PDF in the drop batch. Multi-file imports are
  // deferred — Phase 1 is single-paper focused.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type !== "drop") return;
          const paths = event.payload.paths;
          const pdf = paths.find((p) => p.toLowerCase().endsWith(".pdf"));
          if (pdf) openPath(pdf).catch(console.error);
        });
      } catch (err) {
        console.warn("drag-drop listener failed", err);
      }
    })();
    return () => {
      unlisten?.();
    };
  }, [openPath]);

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-base text-text-primary">
      <TopBar onOpen={onOpen} />
      <main className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" autoSaveId="queriously-main">
          <Panel defaultSize={18} minSize={12} maxSize={32}>
            <Sidebar renderLibrary={() => <LibraryPanel />} />
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={54} minSize={30}>
            <PDFViewer />
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={28} minSize={18} maxSize={45}>
            <RightPanel />
          </Panel>
        </PanelGroup>
      </main>
      <StatusBar />
    </div>
  );
}

function ResizeHandle() {
  return (
    <PanelResizeHandle className="w-[3px] bg-surface-border hover:bg-accent-primary/40 transition-colors" />
  );
}

export default App;
