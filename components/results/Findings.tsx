"use client";

import { useConfig } from "@/lib/i18n";
import type { NotYetId, Phase1PillarId } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { ChevronIcon } from "@/components/ui/ChevronIcon";
import { fill } from "@/lib/config";
import type { FirstStep } from "@/lib/scoring";

type Fix = { pillar: Phase1PillarId; score: number };

/**
 * "What to fix, in order": el primer paso como tarjeta grande; los demás como lista corta ("Then").
 * El primer paso sale de un pilar o, según la situación (lib/scoring.ts stepPlan), del paso de demanda, oferta o escala.
 */
export function Findings({ first, then }: { first: FirstStep | null; then: Fix[] }) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  if (!first) {
    return (
      <section className="border-2 border-rule bg-card px-[18px] py-3.5 min-[561px]:px-6 min-[561px]:py-5">
        <h2 className="mb-3.5 text-lg uppercase">{t.fixTitle}</h2>
        <p>{t.noGaps}</p>
      </section>
    );
  }
  const f = first.kind === "pillar" ? cfg.findings[first.pillar] : { title: cfg.copy.situation[first.situation].stepTitle, step: cfg.copy.situation[first.situation].step };
  return (
    <section className="grid gap-4">
      <h2 className="text-lg uppercase">{first.kind === "pillar" ? t.fixTitle : t.stepsTitle}</h2>
      <article className="border-2 border-t-[6px] border-rule border-t-highlight bg-card px-[18px] py-4 min-[561px]:px-7 min-[561px]:py-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="label-mono text-ink">
            {t.startHere} <span aria-hidden="true">→</span>
          </span>
          {first.kind === "pillar" && <Severity score={first.score} />}
        </div>
        <h3 className="mt-2.5 text-[clamp(22px,4.5vw,28px)]">{f.title}</h3>
        <div className="mt-4 border-l-[6px] border-accent bg-accent-soft px-4 py-3">
          <b className="label-mono mb-1.5 block text-link">{t.firstStep}</b>
          <p>{f.step}</p>
        </div>
      </article>
      {then.length > 0 && (
        <div className="border-2 border-rule bg-card px-[18px] py-3.5 min-[561px]:px-6">
          <h3 className="label-mono mb-1 text-ink-2">{t.thenTitle}</h3>
          <ol>
            {then.map(({ pillar, score }) => (
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

/**
 * "What you probably don't need yet", plegado: toda la fila es el área táctil, con fondo, contador y una flecha que
 * gira al abrir (la animación la anula "reducir movimiento", app/globals.css).
 */
export function NotYet({ items }: { items: NotYetId[] }) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  return (
    <details className="group border-2 border-rule bg-card">
      <summary className="chevron flex min-h-[52px] items-center gap-3 bg-card-2 px-[18px] py-2 hover:bg-line group-open:border-b-2 group-open:border-rule min-[561px]:px-6">
        <h2 className="min-w-0 flex-1 text-lg uppercase">{t.notYetTitle}</h2>
        <Badge tone="strong" className="shrink-0 tabular-nums">
          <span aria-hidden="true">{items.length}</span>
          <span className="sr-only">{fill(t.notYetCount, { n: items.length })}</span>
        </Badge>
        <ChevronIcon className="shrink-0 text-ink transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <ul className="mt-3 mb-4 grid gap-2.5 px-[18px] min-[561px]:px-6">
        {items.map((id) => (
          <li key={id} className="relative pl-[22px] text-[15px] before:absolute before:top-2.5 before:left-0.5 before:h-0.5 before:w-2.5 before:bg-ink-2">
            {cfg.notYet[id]}
          </li>
        ))}
      </ul>
    </details>
  );
}
