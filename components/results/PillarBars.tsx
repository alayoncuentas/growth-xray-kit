"use client";

import { Bar } from "@/components/ui/Bar";
import { LockIcon } from "@/components/ui/LockIcon";
import { fill } from "@/lib/config";
import { useConfig, useLang } from "@/lib/i18n";
import { lockedPillars, pillarsWeakestFirst, scoreTone } from "@/lib/scoring";
import type { PillarScores } from "@/lib/types";

/** Pilares de la fase 1, del más débil al más fuerte; los de la fase 2 en una fila gris con candado. */
export function PillarBars({ scores }: { scores: PillarScores }) {
  const cfg = useConfig();
  const lang = useLang();
  const t = cfg.copy.results;
  const locked = lockedPillars(cfg);
  return (
    <div>
      <p className="-mt-2 mb-2 text-sm text-muted">{t.pillarsSub}</p>
      <ol>
        {pillarsWeakestFirst(cfg, scores).map((p) => (
          <li
            key={p.id}
            className="grid min-h-11 grid-cols-[110px_minmax(0,1fr)_34px] items-center gap-3 border-b border-line py-1.5 text-[15px] min-[441px]:grid-cols-[150px_minmax(0,1fr)_40px]"
          >
            <span>{p.label}</span>
            <Bar value={p.score} tone={scoreTone(p.score)} />
            <span className="text-right font-bold tabular-nums">{p.score}</span>
          </li>
        ))}
      </ol>
      {locked.length > 0 && (
        <p className="flex items-start gap-2 pt-3 text-sm text-ink-2">
          <LockIcon className="mt-[3px] shrink-0" />
          <span>
            {fill(t.lockedSummary, {
              n: locked.length,
              list: new Intl.ListFormat(lang, { type: "conjunction" }).format(locked.map((p) => p.label)),
            })}
          </span>
        </p>
      )}
    </div>
  );
}
