"use client";

import { useId, useState } from "react";
import { cn, formatPKRCompact } from "@/lib/format";

export interface Point {
  label: string;
  value: number;
  detail?: string;
}

/** Value formats by name: server pages can't pass functions to these client components. */
export type ValueFormat = "money" | "count" | "sold";
const formatters: Record<ValueFormat, (v: number) => string> = {
  money: formatPKRCompact,
  count: (v) => new Intl.NumberFormat("en-PK").format(v),
  sold: (v) => `${new Intl.NumberFormat("en-PK").format(v)} sold`,
};

const W = 720;
const H = 220;
const PAD = { top: 16, right: 8, bottom: 28, left: 56 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1);
}

/** Single-series column chart (one hue, no legend) with per-bar hover tooltip and a table for screen readers. */
export function ColumnChart({ data, valueFormat, title, emptyText = "No data for this period yet." }: {
  data: Point[];
  valueFormat: ValueFormat;
  title: string;
  emptyText?: string;
}) {
  const format = formatters[valueFormat];
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length || data.every((d) => d.value === 0)) {
    return <p className="px-5 py-16 text-center text-sm text-cocoa">{emptyText}</p>;
  }

  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.max(2, Math.min(36, slot - 2));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / 8);
  const h = hover !== null ? data[hover] : null;

  return (
    <figure className="relative px-3 pb-2 pt-4" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="sr-only">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-hairline)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-cocoa text-[11px]">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const top = y(d.value);
          const height = PAD.top + plotH - top;
          const r = Math.min(4, barW / 2, height);
          return (
            <g key={`${d.label}-${i}`}>
              {height > 0 && (
                <path
                  d={`M${x},${PAD.top + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD.top + plotH} Z`}
                  fill={hover === i ? "var(--color-espresso)" : "var(--color-gold)"}
                />
              )}
              {/* Hit target taller and wider than the bar. */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
              {i % labelEvery === 0 && (
                <text x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" className="fill-cocoa text-[11px]">{d.label}</text>
              )}
            </g>
          );
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="var(--color-taupe)" strokeWidth={1} />
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 border border-hairline bg-paper px-3 py-2 text-xs shadow-soft"
          style={{ left: `${((PAD.left + hover * slot + slot / 2) / W) * 100}%` }}
        >
          <p className="text-cocoa">{h.label}</p>
          <p className="font-medium tabular-nums">{format(h.value)}</p>
          {h.detail && <p className="text-cocoa">{h.detail}</p>}
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Period</th><th>Value</th></tr></thead>
        <tbody>{data.map((d, i) => <tr key={i}><td>{d.label}</td><td>{format(d.value)}{d.detail ? `, ${d.detail}` : ""}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** Ranked horizontal bars with the label and value written out (identity never relies on colour). */
export function BarList({ items, valueFormat, emptyText = "Nothing to show yet.", className }: {
  items: { label: string; value: number; detail?: string; tone?: string }[];
  valueFormat: ValueFormat;
  emptyText?: string;
  className?: string;
}) {
  const format = formatters[valueFormat];
  if (!items.length) return <p className="px-5 py-10 text-center text-sm text-cocoa">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className={cn("space-y-3 px-5 py-4", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate">
              {item.tone && <span className="size-2 shrink-0 rounded-full" style={{ background: item.tone }} aria-hidden />}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {format(item.value)}
              {item.detail && <span className="ml-2 text-xs text-cocoa">{item.detail}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-linen" aria-hidden>
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
