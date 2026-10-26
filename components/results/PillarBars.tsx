"use client";

import { Bar } from "@/components/ui/Bar";
import { useConfig } from "@/lib/i18n";
import { scoreTone } from "@/lib/scoring";
import type { PillarScores } from "@/lib/types";

/** Pilares de la fase 1 con su barra; los de la fase 2 en gris rayado con "PH. 2". */
export function PillarBars({ scores }: { scores: PillarScores }) {
  const cfg = useConfig();
  return (
    <div>
      {cfg.pillars.map((p) => {
        const s = p.phase === 1 ? scores[p.id] : undefined;
        const locked = s == null;
        return (
          <div
            key={p.id}
            className={`grid grid-cols-[110px_minmax(0,1fr)_34px] items-center gap-3 border-b border-line py-2 text-sm last:border-b-0 min-[441px]:grid-cols-[150px_minmax(0,1fr)_40px] ${locked ? "text-muted" : ""}`}
          >
            <span>{p.label}</span>
            {locked ? (
              <div className="h-2.5 rounded-[5px] bg-[repeating-linear-gradient(135deg,var(--line)_0_6px,transparent_6px_12px)]" />
            ) : (
              <Bar value={s} tone={scoreTone(s)} />
            )}
            <span className={`text-right font-mono font-medium tabular-nums ${locked ? "text-[11px] tracking-[0.05em] whitespace-nowrap" : ""}`}>
              {locked ? cfg.copy.results.lockedPillar : s}
            </span>
          </div>
        );
      })}
    </div>
  );
}
