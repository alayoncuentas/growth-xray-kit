"use client";

import { Bar } from "@/components/ui/Bar";
import { LockIcon } from "@/components/ui/LockIcon";
import { useConfig } from "@/lib/i18n";
import { lockedPillars, pillarsWeakestFirst, scoreTone } from "@/lib/scoring";
import type { PillarScores } from "@/lib/types";

const ROW = "grid grid-cols-[110px_minmax(0,1fr)_34px] items-center gap-3 min-[441px]:grid-cols-[150px_minmax(0,1fr)_40px]";

/**
 * Pilares de la fase 1, del más débil al más fuerte. Los de la fase 2 van debajo, cada uno en su fila: nombre con el
 * mismo peso que los de arriba, una barra punteada (sin medir), un candado discreto y la descripción en segundo plano.
 */
export function PillarBars({ scores }: { scores: PillarScores }) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  const locked = lockedPillars(cfg);
  return (
    <div>
      <p className="-mt-2 mb-2 text-sm text-muted">{t.pillarsSub}</p>
      <ol>
        {pillarsWeakestFirst(cfg, scores).map((p) => (
          <li key={p.id} className={`${ROW} min-h-11 border-b border-line py-1.5 text-[15px]`}>
            <span>{p.label}</span>
            <Bar value={p.score} tone={scoreTone(p.score)} />
            <span className="text-right font-bold tabular-nums">{p.score}</span>
          </li>
        ))}
      </ol>
      {locked.length > 0 && (
        <div className="pt-4">
          <h3 className="label-mono text-ink-2">{t.lockedTitle}</h3>
          <ul>
            {locked.map((p) => (
              <li key={p.id} className="border-b border-line py-2.5 last:border-b-0 last:pb-0">
                <div className={ROW}>
                  <span className="font-display text-[15px] leading-snug font-bold text-ink">{p.label}</span>
                  <span aria-hidden="true" className="h-3 border-2 border-dashed border-line" />
                  <LockIcon size={14} className="justify-self-end text-muted" />
                </div>
                <p className="mt-1 text-sm text-muted">{t.lockedNotes[p.id]}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
