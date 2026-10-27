"use client";

import { useConfig } from "@/lib/i18n";
import type { NotYetId, Phase1PillarId } from "@/lib/types";

type Fix = { pillar: Phase1PillarId; score: number };

/** "What to fix, in order": el primero como tarjeta grande con el primer paso; los demás como lista corta. */
export function Findings({ fixes }: { fixes: Fix[] }) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  if (!fixes.length) {
    return (
      <section className="rounded-panel border border-line bg-card p-5">
        <h2 className="mb-3.5 text-xl">{t.fixTitle}</h2>
        <p>{t.noGaps}</p>
      </section>
    );
  }
  const [first, ...rest] = fixes;
  const f = cfg.findings[first.pillar];
  return (
    <section className="grid gap-4">
      <h2 className="text-xl">{t.fixTitle}</h2>
      <article className="rounded-panel border-2 border-accent bg-card p-[clamp(20px,4vw,28px)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="label-mono text-xs text-accent">{t.startHere}</span>
          <Severity score={first.score} />
        </div>
        <h3 className="mt-2 text-[clamp(22px,4.5vw,28px)] tracking-[-0.015em]">{f.title}</h3>
        <div className="mt-3.5 rounded-lg bg-accent-soft px-4 py-3">
          <b className="label-mono mb-1.5 block font-semibold text-accent">{t.firstStep}</b>
          <p>{f.step}</p>
        </div>
      </article>
      {rest.length > 0 && (
        <div className="rounded-panel border border-line bg-card p-5">
          <h3 className="label-mono mb-1 text-muted">{t.thenTitle}</h3>
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
    <span
      className={`justify-self-start rounded-full border px-[7px] py-1 font-mono text-[11px] leading-none font-medium tracking-[0.06em] uppercase ${high ? "border-bad text-bad" : "border-warn text-warn"}`}
    >
      {high ? t.severityHigh : t.severityMid}
    </span>
  );
}

/** "What you probably don't need yet", plegado. */
export function NotYet({ items }: { items: NotYetId[] }) {
  const cfg = useConfig();
  return (
    <details className="rounded-panel border border-line bg-card p-5">
      <summary className="cursor-pointer">
        <h2 className="inline text-xl">{cfg.copy.results.notYetTitle}</h2>
      </summary>
      <ul className="mt-3.5 grid gap-2.5">
        {items.map((id) => (
          <li key={id} className="relative pl-[22px] text-[15px] before:absolute before:top-2.5 before:left-0.5 before:h-0.5 before:w-2.5 before:bg-muted">
            {cfg.notYet[id]}
          </li>
        ))}
      </ul>
    </details>
  );
}
