"use client";

import { fill, usd } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import type { CalcResult, Situation } from "@/lib/scoring";

/**
 * "What your numbers say": la situación cuando la oportunidad principal no es cerrar fugas (demand, offer, scale;
 * docs/SPEC.md §3). Lenguaje situacional: describe los números, no juzga a la persona. En el parcial (`compact`),
 * solo el titular.
 */
export function SituationCard({
  situation,
  confirmed,
  capacity,
  calc,
  compact = false,
}: {
  situation: Exclude<Situation, "leak">;
  /** scale: el índice y el volumen confirman que el sistema funciona; si no, solo se repite lo que declaró el dueño. */
  confirmed: boolean;
  capacity: boolean;
  calc: CalcResult;
  compact?: boolean;
}) {
  const s = useConfig().copy.situation;
  const t = s[situation];
  const title = situation === "scale" && !confirmed ? t.titleDeclared : t.title;
  const text = calc.lostWeek === 0 && t.textNone ? t.textNone : t.text;
  const vars = { weekly: calc.weekly, annual: usd(calc.annual), value: usd(calc.value), lostWeek: calc.lostWeek };
  return (
    <section className="border-2 border-l-[6px] border-rule border-l-accent bg-card px-[18px] py-4 min-[561px]:px-6 min-[561px]:py-5">
      <h2 className="label-mono text-link">{s.numbersTitle}</h2>
      <p className="mt-2 font-display text-[clamp(20px,4vw,24px)] leading-snug font-bold">{title}</p>
      {!compact && (
        <>
          <p className="mt-2 max-w-[60ch] text-ink-2">{fill(text, vars)}</p>
          {capacity && <p className="mt-2 max-w-[60ch] text-[15px] text-ink-2">{t.capacity}</p>}
        </>
      )}
    </section>
  );
}
