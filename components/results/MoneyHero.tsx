"use client";

import Link from "next/link";
import { fill, usd } from "@/lib/config";
import { approx, figureFontSize } from "@/lib/format";
import { useConfig } from "@/lib/i18n";
import { cautiousAnnual, customersBucket, lostCustomersPerYear, type CalcResult } from "@/lib/scoring";
import type { CalculatorQuestion } from "@/lib/types";

/**
 * Cifra principal de los resultados: el dinero en juego al año, en una línea aunque sea $650,000,000 a 320 px
 * (tamaño relativo al contenedor, lib/format.ts). Completo: clientes al año, escenario prudente y "How we calculate it".
 * Parcial (`figureOnly`): solo la cifra y su unidad (docs/OPEN_ENTRY.md decisión 2).
 */
export function MoneyHero({ calc, figureOnly = false, editHref = null }: { calc: CalcResult; figureOnly?: boolean; editHref?: string | null }) {
  const cfg = useConfig();
  const m = cfg.copy.money;
  const figure = usd(calc.annual);
  return (
    // Resumen clave: el campo naranja ancho del sistema, con todo el texto en negro (on-accent).
    <section className="bg-leak px-[18px] py-5 text-highlight-ink min-[561px]:px-8 min-[561px]:py-7">
      <h2 className="label-mono">{cfg.copy.results.moneyTitle}</h2>
      <div className="@container mt-2">
        <p
          className="numeral whitespace-nowrap"
          style={{ fontSize: figureFontSize(figure) }}
          data-hero-figure
        >
          {figure}
        </p>
      </div>
      <p className="label-mono mt-2 text-sm">{m.heroUnit}</p>
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
      <p className="mt-4 max-w-[52ch] text-[17px]">{fill(line, { customers: Math.round(customers).toLocaleString("en-US") })}</p>
      <p className="mt-1 max-w-[60ch] text-[15px]">{fill(m.heroCautious, { cautiousAnnual: usd(cautiousAnnual(calc)) })}</p>
      <details className="mt-4 border-t-2 border-highlight-ink pt-1">
        <summary className="flex min-h-11 items-center text-[15px] font-bold underline-offset-4 hover:underline">{m.howTitle}</summary>
        <ol className="mt-1 grid list-decimal gap-1.5 pl-5 text-[15px] tabular-nums">
          <li>{fill(m.howMissed, { unanswered: calc.unanswered, noFollowup: calc.noFollowup, lostWeek: calc.lostWeek, missed })}</li>
          <li>{fill(m.howMonthly, { missed, closeOf10: calc.closeOf10, value: usd(calc.value), monthly: usd(calc.monthly) })}</li>
          <li>{fill(m.howAnnual, { monthly: usd(calc.monthly), annual: usd(calc.annual) })}</li>
        </ol>
        {disclaimer && <p className="mt-3 max-w-[70ch] text-sm">{disclaimer}</p>}
        {editHref && (
          <p className="mt-1 text-sm">
            <Link href={editHref} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">
              {m.howEdit}
            </Link>
          </p>
        )}
      </details>
    </>
  );
}
