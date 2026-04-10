import { useEffect, useRef, useState } from "react";
import type { PdfDoc } from "../../lib/pdfjs";
import { pdfjsLib } from "../../lib/pdfjs";
import { AnnotationLayer } from "./AnnotationLayer";
import { MarginaliaLayer } from "./MarginaliaLayer";

type Props = {
  doc: PdfDoc;
  pageNumber: number;
  zoom: number;
  onVisible?: (page: number) => void;
};

/**
 * Renders a single PDF page to a canvas with an absolutely-positioned text
 * layer on top. The text layer is rendered from pdfjs's extracted character
 * geometry so native browser selection works across lines and columns.
 *
 * Each page is lazily rendered the first time it intersects the viewport —
 * once rendered, it stays mounted (keeps selection / scroll stable) but we
 * only pay the render cost for pages the user actually looks at.
 */
export function PdfPage({ doc, pageNumber, zoom, onVisible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [rendered, setRendered] = useState(false);

  // First pass: fetch the page to learn its dimensions so the placeholder
  // reserves the correct height and the virtualizer can measure accurately.
  useEffect(() => {
    let cancelled = false;
    doc.getPage(pageNumber).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: zoom });
      setSize({ w: viewport.width, h: viewport.height });
    });
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, zoom]);

  // Intersection observer: render on first visibility, track active page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onVisible?.(pageNumber);
            if (!rendered) {
              void renderPage();
            }
          }
        }
      },
      { root: null, threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rendered, pageNumber, zoom]);

  // Re-render the canvas when the zoom level changes for an already-rendered
  // page. The text layer is rebuilt from scratch with the new viewport.
  useEffect(() => {
    if (!rendered) return;
    void renderPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  async function renderPage() {
    const canvas = canvasRef.current;
    const textLayer = textLayerRef.current;
    if (!canvas || !textLayer) return;
    const page = await doc.getPage(pageNumber);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: zoom });

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Build text layer. We clear and re-populate on each render so zoom works.
    textLayer.innerHTML = "";
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;
    try {
      // pdfjs 4.x: construct a TextLayer and render it. Falls back silently
      // if the runtime signature drifts so the canvas still paints.
      const tl = new pdfjsLib.TextLayer({
        textContentSource: page.streamTextContent(),
        container: textLayer,
        viewport,
      });
      await tl.render();
    } catch (err) {
      console.warn("text layer failed", err);
    }

    setRendered(true);
  }

  return (
    <div
      ref={containerRef}
      data-page={pageNumber}
      className="relative mx-auto my-4 shadow-lg bg-white"
      style={{
        width: size ? `${size.w}px` : undefined,
        height: size ? `${size.h}px` : undefined,
      }}
    >
      <canvas ref={canvasRef} className="block" />
      <div
        ref={textLayerRef}
        className="textLayer absolute inset-0 leading-none"
        style={{
          // pdfjs text layer expects these CSS variables / positioning
          color: "transparent",
          overflow: "hidden",
        }}
      />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">
          Page {pageNumber}
        </div>
      )}
      <AnnotationLayer page={pageNumber} />
      <MarginaliaLayer page={pageNumber} />
    </div>
  );
}
