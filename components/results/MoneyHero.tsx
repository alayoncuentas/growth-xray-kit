"use client";

import Link from "next/link";
import { fill, usd } from "@/lib/config";
import { approx, figureFontSize } from "@/lib/format";
import { useConfig } from "@/lib/i18n";
import { cautiousAnnual, customersBucket, lostCustomersPerYear, type CalcResult } from "@/lib/scoring";
import type { CalculatorQuestion } from "@/lib/types";

/**
 * Cifra principal de los resultados: el dinero en juego al año, en una línea aunque sea $63,000,000 a 400 px
 * (tamaño relativo al contenedor, lib/format.ts). Completo: clientes al año, escenario prudente y "How we calculate it".
 * Parcial (`figureOnly`): solo la cifra y su unidad (docs/OPEN_ENTRY.md decisión 2).
 */
export function MoneyHero({ calc, figureOnly = false, editHref = null }: { calc: CalcResult; figureOnly?: boolean; editHref?: string | null }) {
  const cfg = useConfig();
  const m = cfg.copy.money;
  const figure = usd(calc.annual);
  return (
    <section className="rounded-panel bg-leak-soft p-[clamp(20px,4vw,32px)]">
      <h2 className="label-mono text-xs text-ink">{cfg.copy.results.moneyTitle}</h2>
      <div className="@container mt-2">
        <p
          className="font-display leading-none font-bold tracking-[-0.02em] whitespace-nowrap text-leak tabular-nums"
          style={{ fontSize: figureFontSize(figure) }}
          data-hero-figure
        >
          {figure}
        </p>
      </div>
      <p className="mt-1.5 text-lg font-semibold">{m.heroUnit}</p>
      {!figureOnly && <HeroDetail calc={calc} editHref={editHref} />}
    </section>
  );
}

function HeroDetail({ calc, editHref }: { calc: CalcResult; editHref: string | null }) {
  const cfg = useConfig();
  const m = cfg.copy.money;
  const customers = lostCustomersPerYear(calc);
  const bucket = customersBucket(customers);
  const line = { few: m.heroCustomersFew, one: m.heroCustomersOne, many: m.heroCustomers }[bucket];
  const disclaimer = cfg.questions.find((q): q is CalculatorQuestion => q.type === "calculator")?.disclaimer;
  const missed = approx(calc.missed);
  return (
    <>
      <p className="mt-3 max-w-[52ch] text-[17px]">{fill(line, { customers: Math.round(customers).toLocaleString("en-US") })}</p>
      <p className="mt-1 max-w-[56ch] text-[15px] text-ink/80">{fill(m.heroCautious, { cautiousAnnual: usd(cautiousAnnual(calc)) })}</p>
      <details className="group mt-4 border-t border-leak/25 pt-3">
        <summary className="cursor-pointer text-[15px] font-semibold underline-offset-2 hover:underline">{m.howTitle}</summary>
        <ol className="mt-3 grid list-decimal gap-1.5 pl-5 text-[15px] tabular-nums">
          <li>{fill(m.howMissed, { inquiries: calc.inquiries, leak: calc.leak, missed })}</li>
          <li>{fill(m.howMonthly, { missed, close: calc.close, value: usd(calc.value), monthly: usd(calc.monthly) })}</li>
          <li>{fill(m.howAnnual, { monthly: usd(calc.monthly), annual: usd(calc.annual) })}</li>
        </ol>
        {disclaimer && <p className="mt-3 text-[13px] text-ink/80">{disclaimer}</p>}
        {editHref && (
          <p className="mt-3 text-sm">
            <Link href={editHref} className="font-semibold underline underline-offset-2">
              {m.howEdit}
            </Link>
          </p>
        )}
      </details>
    </>
  );
}
