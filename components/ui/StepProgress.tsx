"use client";

import { fill } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import type { Progress } from "@/lib/flow";

/** Barra de 4 partes + "Part n of 4 · …  About n min left". */
export function StepProgress({ p }: { p: Progress }) {
  const { copy } = useConfig();
  return (
    <>
      <div className="mt-1 mb-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${p.perSection.length}, 1fr)` }}>
        {p.perSection.map((f, k) => (
          <div key={k} className="h-1.5 overflow-hidden bg-line">
            <i
              className="block h-full bg-accent transition-[width] duration-[160ms] ease-linear"
              style={{ width: `${k < p.sectionIndex ? 100 : k === p.sectionIndex ? Math.max(8, f * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="label-mono mb-7 flex flex-wrap justify-between gap-3 text-ink-2">
        <span>{fill(copy.question.part, { n: p.sectionIndex + 1, total: p.perSection.length, label: p.sectionLabel })}</span>
        <span>{fill(copy.question.minutesLeft, { n: p.minutesLeft })}</span>
      </div>
    </>
  );
}
