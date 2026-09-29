import { useEffect, useRef, useState } from "react";

// Hand-made SVG charts for the admin dashboard (no chart library needed).
// Colours come from the theme: sienna for the data, light lines for the grid.
const SERIES = "var(--color-sienna)";
const GRID = "rgba(91, 58, 41, 0.12)";
const AXIS_TEXT = "rgba(43, 29, 20, 0.5)";

// Measures a box's width so the SVG can be drawn at real pixel size (text never stretches)
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

// A "nice" top for the y-axis: 0 → 1000, 3700 → 4000, 12,500 → 15,000
function niceMax(value) {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * magnitude >= value);
  return step * magnitude;
}

// Smooth line through the points that never overshoots above/below them
function smoothPath(points) {
  return points
    .map(([x, y], i) => {
      if (i === 0) return `M${x},${y}`;
      const [px, py] = points[i - 1];
      const midX = (px + x) / 2;
      return `C${midX},${py} ${midX},${y} ${x},${y}`;
    })
    .join(" ");
}

// Small box that follows the mouse / finger
function Tooltip({ x, y, width, children }) {
  const left = Math.min(Math.max(x, 70), width - 70); // keep it inside the card
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-espresso px-3 py-2 text-xs text-cream shadow-lg"
      style={{ left, top: y - 10 }}
    >
      {children}
    </div>
  );
}

// ─── Area chart: one value per day ────────────────────────────────────────────
// data: [{ label: "29 Sep", value: 12500, detail: "8 orders" }]
export function AreaChart({ data, formatValue, height = 240, label, color = SERIES, fill = color }) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState(null);

  const pad = { top: 16, right: 24, bottom: 28, left: 48 };
  const plotW = Math.max(width - pad.left - pad.right, 0);
  const plotH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const x = (i) => pad.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v) => pad.top + plotH - (v / max) * plotH;
  const points = data.map((d, i) => [x(i), y(d.value)]);
  const line = smoothPath(points);
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  // Fewer date labels on narrow screens so they never overlap
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(Math.floor(plotW / 64), 1)));

  const handleMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - box.left;
    const index = Math.round(((mouseX - pad.left) / plotW) * (data.length - 1));
    setActive(Math.min(Math.max(index, 0), data.length - 1));
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block touch-none">
          <defs>
            <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity="0.45" />
              <stop offset="100%" stopColor={fill} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={GRID} />
              <text x={pad.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill={AXIS_TEXT}>
                {tick >= 1000 ? `${tick / 1000}k` : tick}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            // count back from the last day, so "today" is always labelled
            (data.length - 1 - i) % labelEvery === 0 ? (
              <text key={d.label} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
                {d.label}
              </text>
            ) : null
          )}

          <path d={area} fill="url(#area-fill)" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={pad.top} y2={y(0)} stroke={AXIS_TEXT} strokeDasharray="3 3" />
              <circle cx={x(active)} cy={y(data[active].value)} r="5" fill={color} stroke="white" strokeWidth="2" />
            </g>
          )}

          {/* Invisible layer that catches the mouse over the whole plot */}
          <rect
            x={pad.left}
            y={pad.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={handleMove}
            onPointerDown={handleMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}

      {active !== null && (
        <Tooltip x={x(active)} y={y(data[active].value)} width={width}>
          <p className="font-semibold">{data[active].label}</p>
          <p className="text-sm font-bold text-gold-light">{formatValue(data[active].value)}</p>
          {data[active].detail && <p className="text-cream/70">{data[active].detail}</p>}
        </Tooltip>
      )}
    </div>
  );
}

// ─── Column chart: orders per hour ───────────────────────────────────────────
// data: [{ label: "9 AM", value: 12 }]
// peakColor: the busiest column(s) are painted in this colour so they stand out
export function ColumnChart({ data, unit, height = 240, label, color = SERIES, peakColor = color }) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState(null);

  const pad = { top: 16, right: 8, bottom: 28, left: 36 };
  const plotW = Math.max(width - pad.left - pad.right, 0);
  const plotH = height - pad.top - pad.bottom;
  const rawMax = Math.max(...data.map((d) => d.value));
  const max = rawMax <= 4 ? 4 : niceMax(rawMax);
  const ticks = [0, 0.5, 1].map((t) => Math.round(t * max));

  const slot = plotW / data.length;
  const barW = Math.max(Math.min(slot - 6, 28), 4);
  const y = (v) => pad.top + plotH - (v / max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(Math.floor(plotW / 44), 1)));

  // Bar with 4px rounded top corners, flat on the baseline
  const barPath = (bx, top, w, bottom) => {
    const r = Math.min(4, w / 2, bottom - top);
    if (r <= 0) return "";
    return `M${bx},${bottom} V${top + r} Q${bx},${top} ${bx + r},${top} H${bx + w - r} Q${bx + w},${top} ${bx + w},${top + r} V${bottom} Z`;
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="block">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={GRID} />
              <text x={pad.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill={AXIS_TEXT}>
                {tick}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const isActive = active === i;
            return (
              <g key={d.label}>
                <path
                  d={barPath(cx - barW / 2, y(d.value), barW, y(0))}
                  fill={rawMax > 0 && d.value === rawMax ? peakColor : color}
                  opacity={active === null || isActive ? 1 : 0.45}
                />
                {(data.length - 1 - i) % labelEvery === 0 && (
                  <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
                    {d.label}
                  </text>
                )}
                {/* Hit area: the whole column slot, bigger than the bar itself */}
                <rect
                  x={pad.left + slot * i}
                  y={pad.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                />
              </g>
            );
          })}
        </svg>
      )}

      {active !== null && (
        <Tooltip x={pad.left + slot * active + slot / 2} y={y(data[active].value)} width={width}>
          <p className="font-semibold">{data[active].label}</p>
          <p className="text-sm font-bold text-gold-light">
            {data[active].value} {unit}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

// ─── Tiny charts inside the stat tiles (decoration under the big number) ────
// They stretch to the tile's width (no text inside, so stretching is safe)
export function Sparkline({ values, height = 36, color = SERIES }) {
  const W = 100;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => [
    (i / Math.max(values.length - 1, 1)) * W,
    height - 3 - (v / max) * (height - 6),
  ]);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true" className="block w-full">
      <path d={smoothPath(points)} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

export function MiniBars({ values, height = 36, color = SERIES }) {
  const W = 100;
  const max = Math.max(...values, 1);
  const slot = W / values.length;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true" className="block w-full">
      {values.map((v, i) => {
        const h = Math.max((v / max) * height, v > 0 ? 3 : 1);
        return (
          <rect key={i} x={i * slot + slot * 0.15} y={height - h} width={slot * 0.7} height={h} fill={color} opacity={v > 0 ? 1 : 0.25} />
        );
      })}
    </svg>
  );
}