"use client";

import { useId, useMemo, useState } from "react";
import type { TrendPoint } from "@/lib/types";

const WIDTH = 640;
const HEIGHT = 180;
const PAD_X = 8;
const PAD_Y = 16;

export function TrendChart({
  points,
  base,
  target,
  loading,
}: {
  points: TrendPoint[];
  base: string;
  target: string;
  loading?: boolean;
}) {
  const gradientId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { path, area, coords } = useMemo(() => {
    if (points.length === 0) {
      return { path: "", area: "", coords: [] as { x: number; y: number }[] };
    }
    const rates = points.map((p) => p.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const span = max - min || max * 0.01 || 1;
    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_Y * 2;
    const coords = points.map((p, i) => {
      const x = PAD_X + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
      const y = PAD_Y + innerH - ((p.rate - min) / span) * innerH;
      return { x, y };
    });
    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
    const area = `${path} L${coords[coords.length - 1].x.toFixed(2)},${HEIGHT - PAD_Y} L${coords[0].x.toFixed(2)},${HEIGHT - PAD_Y} Z`;
    return { path, area, coords };
  }, [points]);

  if (loading) {
    return (
      <div className="flex h-[220px] items-center justify-center font-mono text-xs text-ink-dim">
        loading trend…
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-center font-mono text-xs text-ink-dim">
        No trend data yet for {base}/{target}.
        <br />
        Snapshots build up once per day.
      </div>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const changePct = first.rate === 0 ? 0 : ((last.rate - first.rate) / first.rate) * 100;
  const up = changePct >= 0;
  const active = hoverIdx !== null ? points[hoverIdx] : last;
  const sparse = points.length < 2;

  if (sparse) {
    return (
      <div>
        <div className="font-mono text-4xl font-medium tabular text-ink">{last.rate.toFixed(4)}</div>
        <p className="mt-3 max-w-xs font-mono text-xs text-ink-dim">
          Trend builds up daily — 1 of 30 days recorded for {base}/{target} so
          far. Check back tomorrow.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-mono text-2xl font-medium tabular text-ink">
          {active.rate.toFixed(4)}
          <span className="ml-2 text-sm text-ink-dim">{active.date}</span>
        </div>
        <div
          className={`flex items-center gap-1 font-mono text-xs font-medium ${
            up ? "text-teal" : "text-coral"
          }`}
        >
          <span aria-hidden>{up ? "▲" : "▼"}</span>
          {Math.abs(changePct).toFixed(2)}% / {points.length}d
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label={`${base} to ${target} rate trend over the last ${points.length} days, from ${first.rate} to ${last.rate}`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--amber-bright)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--amber-bright)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={PAD_Y + (i * (HEIGHT - PAD_Y * 2)) / 3}
            y2={PAD_Y + (i * (HEIGHT - PAD_Y * 2)) / 3}
            stroke="var(--hairline)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill={`url(#${gradientId})`} stroke="none" />
        <path d={path} fill="none" stroke="var(--amber-bright)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {coords.map((c, i) => (
          <rect
            key={i}
            x={c.x - (WIDTH / points.length) / 2}
            y={0}
            width={WIDTH / points.length}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
            onFocus={() => setHoverIdx(i)}
          />
        ))}

        {hoverIdx !== null && (
          <>
            <line
              x1={coords[hoverIdx].x}
              x2={coords[hoverIdx].x}
              y1={PAD_Y}
              y2={HEIGHT - PAD_Y}
              stroke="var(--ink-dim)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={coords[hoverIdx].x} cy={coords[hoverIdx].y} r="4" fill="var(--amber-bright)" />
          </>
        )}
      </svg>

      <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wide text-ink-dim">
        <span>{first.date}</span>
        <span>{last.date}</span>
      </div>

      {points.length < 30 && (
        <p className="mt-2 font-mono text-[11px] text-ink-dim">
          {points.length} of 30 days recorded — the trend fills in daily.
        </p>
      )}

      <details className="mt-3 group">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wide text-ink-dim hover:text-ink">
          View as table
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-hairline">
          <table className="w-full font-mono text-xs">
            <thead className="sticky top-0 bg-panel-raised text-ink-dim">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Date</th>
                <th className="px-2 py-1 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t border-hairline">
                  <td className="px-2 py-1 text-ink-dim">{p.date}</td>
                  <td className="px-2 py-1 text-right tabular text-ink">{p.rate.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
