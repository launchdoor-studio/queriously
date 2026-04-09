type Props = {
  size?: number;
  className?: string;
};

/**
 * Inline SVG recreation of the Queriously brand mark: a crimson magnifying
 * glass / "Q" glyph. Drawn with `currentColor` so the mark can be tinted by
 * Tailwind text colour utilities (used as `text-accent-primary` in chrome
 * where we always want the brand crimson, regardless of theme).
 *
 * Using an inline SVG instead of the bundled PNGs means the glyph has a
 * transparent background — no visible square on dark or light surfaces.
 */
export function Logo({ size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Queriously"
      role="img"
    >
      {/* Magnifying-glass ring */}
      <circle cx="42" cy="42" r="28" stroke="currentColor" strokeWidth="12" />
      {/* Handle — thick, angled down-right, matching the brand mark */}
      <line
        x1="62"
        y1="62"
        x2="86"
        y2="86"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}
