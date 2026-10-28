"use client";

import { useConfig } from "@/lib/i18n";
import type { NotYetId, Phase1PillarId } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

type Fix = { pillar: Phase1PillarId; score: number };

/** "What to fix, in order": el primero como tarjeta grande con el primer paso; los demás como lista corta. */
export function Findings({ fixes }: { fixes: Fix[] }) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  if (!fixes.length) {
    return (
      <section className="border-2 border-rule bg-card px-[18px] py-3.5 min-[561px]:px-6 min-[561px]:py-5">
        <h2 className="mb-3.5 text-lg uppercase">{t.fixTitle}</h2>
        <p>{t.noGaps}</p>
      </section>
    );
  }
  const [first, ...rest] = fixes;
  const f = cfg.findings[first.pillar];
  return (
    <section className="grid gap-4">
      <h2 className="text-lg uppercase">{t.fixTitle}</h2>
      <article className="border-2 border-t-[6px] border-rule border-t-highlight bg-card px-[18px] py-4 min-[561px]:px-7 min-[561px]:py-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="label-mono text-ink">
            {t.startHere} <span aria-hidden="true">→</span>
          </span>
          <Severity score={first.score} />
        </div>
        <h3 className="mt-2.5 text-[clamp(22px,4.5vw,28px)]">{f.title}</h3>
        <div className="mt-4 border-l-[6px] border-accent bg-accent-soft px-4 py-3">
          <b className="label-mono mb-1.5 block text-link">{t.firstStep}</b>
          <p>{f.step}</p>
        </div>
      </article>
      {rest.length > 0 && (
        <div className="border-2 border-rule bg-card px-[18px] py-3.5 min-[561px]:px-6">
          <h3 className="label-mono mb-1 text-ink-2">{t.thenTitle}</h3>
          <ol>
            {rest.map(({ pillar, score }) => (
              <li key={pillar} className="grid gap-1.5 border-b border-line py-3 last:border-b-0 last:pb-0">
                <Severity score={score} />
                <span className="font-display text-[17px] leading-snug font-bold">{cfg.findings[pillar].title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Severity({ score }: { score: number }) {
  const t = useConfig().copy.results;
  const high = score < 45;
  return (
    <Badge tone={high ? "danger" : "highlight"} className="justify-self-start">
      {high ? t.severityHigh : t.severityMid}
    </Badge>
  );
}

/** "What you probably don't need yet", plegado. */
export function NotYet({ items }: { items: NotYetId[] }) {
  const cfg = useConfig();
  return (
    <details className="border-2 border-rule bg-card px-[18px] py-1.5 min-[561px]:px-6">
      <summary className="flex min-h-11 items-center">
        <h2 className="inline text-lg uppercase">{cfg.copy.results.notYetTitle}</h2>
      </summary>
      <ul className="mt-1 mb-3 grid gap-2.5">
        {items.map((id) => (
          <li key={id} className="relative pl-[22px] text-[15px] before:absolute before:top-2.5 before:left-0.5 before:h-0.5 before:w-2.5 before:bg-ink-2">
            {cfg.notYet[id]}
          </li>
        ))}
      </ul>
    </details>
  );
}
