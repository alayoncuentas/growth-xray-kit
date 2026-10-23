import { copy, phase1 } from "@/lib/config";
import { scoreTone } from "@/lib/scoring";
import type { ArchetypeId, IndexBand } from "@/lib/types";

export function ArchetypeHeader({ archetype, avg, band }: { archetype: ArchetypeId; avg: number; band: IndexBand }) {
  const a = phase1.archetypes[archetype];
  const tone = { good: "text-good", warn: "text-warn", bad: "text-bad" }[scoreTone(avg)];
  return (
    <div className="mt-2 mb-7 grid items-end gap-6 min-[621px]:grid-cols-[1fr_auto]">
      <div>
        <h1 className="text-[clamp(34px,7vw,56px)] tracking-[-0.025em]">{a.name}</h1>
        <p className="mt-2.5 max-w-[52ch] text-lg text-muted">{a.line}</p>
      </div>
      <div className="min-[621px]:text-right">
        <div className="label-mono text-muted">{copy.results.indexLabel}</div>
        <div className="font-display text-[64px] leading-none font-bold tabular-nums">
          {avg}
          <small className="text-xl font-semibold text-muted">/100</small>
        </div>
        <div className={`label-mono ${tone}`}>{phase1.indexBands[band]}</div>
      </div>
    </div>
  );
}
