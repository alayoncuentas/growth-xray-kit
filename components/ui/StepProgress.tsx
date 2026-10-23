import { copy, fill } from "@/lib/config";
import type { Progress } from "@/lib/flow";

/** Barra de 4 partes + "Part n of 4 · …  About n min left". */
export function StepProgress({ p }: { p: Progress }) {
  return (
    <>
      <div className="mt-1 mb-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${p.perSection.length}, 1fr)` }}>
        {p.perSection.map((f, k) => (
          <div key={k} className="h-1 overflow-hidden rounded-xs bg-line">
            <i
              className="block h-full bg-accent transition-[width] duration-300"
              style={{ width: `${k < p.sectionIndex ? 100 : k === p.sectionIndex ? Math.max(8, f * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mb-7 flex flex-wrap justify-between gap-3 font-mono text-xs font-medium tracking-[0.03em] text-muted">
        <span>{fill(copy.question.part, { n: p.sectionIndex + 1, total: p.perSection.length, label: p.sectionLabel })}</span>
        <span>{fill(copy.question.minutesLeft, { n: p.minutesLeft })}</span>
      </div>
    </>
  );
}
