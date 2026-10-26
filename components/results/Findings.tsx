"use client";

import { useConfig } from "@/lib/i18n";
import type { NotYetId, Phase1PillarId } from "@/lib/types";

export function Findings({ fixes }: { fixes: { pillar: Phase1PillarId; score: number }[] }) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  if (!fixes.length) return <p>{t.noGaps}</p>;
  return (
    <div>
      {fixes.map(({ pillar, score }, n) => {
        const f = cfg.findings[pillar];
        const high = score < 45;
        return (
          <div key={pillar} className="grid gap-1.5 border-b border-line py-3.5 first:pt-0 last:border-b-0 last:pb-0">
            <span className={`justify-self-start rounded-full border px-[7px] py-1 font-mono text-[11px] leading-none font-medium tracking-[0.06em] uppercase ${high ? "border-bad text-bad" : "border-warn text-warn"}`}>
              {high ? t.severityHigh : t.severityMid}
            </span>
            <h3 className="text-[17px]">{f.title}</h3>
            {n === 0 && (
              <p className="rounded-lg bg-accent-soft px-3 py-2.5 text-sm">
                <b className="label-mono mb-[5px] block leading-none font-semibold text-accent">{t.firstStep}</b>
                {f.step}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NotYetList({ items }: { items: NotYetId[] }) {
  const cfg = useConfig();
  return (
    <ul className="grid gap-2.5">
      {items.map((id) => (
        <li key={id} className="relative pl-[22px] text-[15px] before:absolute before:top-2.5 before:left-0.5 before:h-0.5 before:w-2.5 before:bg-muted">
          {cfg.notYet[id]}
        </li>
      ))}
    </ul>
  );
}
