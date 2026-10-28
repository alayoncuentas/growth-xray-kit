"use client";

import { fill } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import { scoreTone } from "@/lib/scoring";
import type { IndexBand } from "@/lib/types";

// Tramos del medidor: los mismos cortes que indexBand / scoreTone (45 y 70).
const SEGMENTS = [
  { from: 0, to: 45, tone: "bad" },
  { from: 45, to: 70, tone: "warn" },
  { from: 70, to: 100, tone: "good" },
] as const;
const BG = { good: "bg-good", warn: "bg-warn", bad: "bg-bad" } as const;

/** Índice del sistema como medidor de 0 a 100 con sus tres tramos; la banda en texto (ink) con un punto de color. */
export function IndexMeter({ avg, band }: { avg: number; band: IndexBand }) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  const tone = scoreTone(avg);
  const bandName = cfg.indexBands[band];
  return (
    <div>
      <div className="label-mono text-muted">{t.indexLabel}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="numeral text-[56px]">
          {avg}
          <small className="text-xl font-bold tracking-normal text-muted">/100</small>
        </span>
        <span className="label-mono inline-flex items-center gap-1.5 text-sm text-ink">
          <i aria-hidden="true" className={`inline-block size-2.5 ${BG[tone]}`} />
          {bandName}
        </span>
      </div>
      <div
        role="meter"
        aria-label={t.indexLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={avg}
        aria-valuetext={fill(t.indexAria, { avg, band: bandName })}
        className="relative mt-4 flex h-3 gap-0.5"
      >
        {SEGMENTS.map((s) => (
          <i
            key={s.tone}
            className={`block h-full ${BG[s.tone]} ${s.tone === tone ? "" : "opacity-30"}`}
            style={{ width: `${s.to - s.from}%` }}
          />
        ))}
        <i
          aria-hidden="true"
          className="absolute -top-1.5 block h-6 w-1 -translate-x-1/2 bg-ink outline-2 outline-card"
          style={{ left: `${Math.min(100, Math.max(0, avg))}%` }}
        />
      </div>
      <div aria-hidden="true" className="relative mt-1.5 h-4 text-xs text-muted tabular-nums">
        {[0, 45, 70, 100].map((n) => (
          <span key={n} className={`absolute ${n === 0 ? "" : n === 100 ? "right-0" : "-translate-x-1/2"}`} style={n === 100 ? undefined : { left: `${n}%` }}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
