"use client";

import { fill, getPhase2Config } from "@/lib/config";
import { useLang } from "@/lib/i18n";
import type { Progress2 } from "@/lib/phase2";

/** Barra de 8 bloques + "Block n of 8 · …  About n min left" (mismo diseño que StepProgress de la fase 1). */
export function Phase2Progress({
  p,
  total,
  label,
}: {
  p: Pick<Progress2, "perBlock" | "blockIndex" | "blockLabel" | "minutesLeft">;
  total: number;
  /** Otro texto a la izquierda (la pausa dice "Block n of 8 done"). */
  label?: string;
}) {
  const f = getPhase2Config(useLang()).copy.flow;
  return (
    <>
      <div className="mt-1 mb-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${p.perBlock.length}, 1fr)` }}>
        {p.perBlock.map((v, k) => (
          <div key={k} className="h-1.5 overflow-hidden bg-line">
            <i
              className="block h-full bg-accent transition-[width] duration-[160ms] ease-linear"
              style={{ width: `${k < p.blockIndex ? 100 : k === p.blockIndex ? Math.max(8, v * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="label-mono mb-7 flex flex-wrap justify-between gap-3 text-ink-2">
        <span>{label ?? fill(f.block, { n: p.blockIndex + 1, total, label: p.blockLabel })}</span>
        {p.minutesLeft > 0 && <span>{fill(f.minutesLeft, { n: p.minutesLeft })}</span>}
      </div>
    </>
  );
}
