"use client";

import { fill, usd } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import type { CalcResult } from "@/lib/scoring";

/** Dos tarjetas de la calculadora: dinero que se escapa al mes (naranja) y escenario cauteloso (verde azulado). */
export function MoneyAtStake({ calc }: { calc: CalcResult }) {
  const m = useConfig().copy.money;
  return (
    <div className="mt-4 grid gap-3 min-[521px]:grid-cols-2">
      <Tile
        tone="leak"
        label={m.monthlyLabel}
        value={calc.monthly}
        detail={fill(m.monthlyDetail, { missed: Math.round(calc.missed), annual: usd(calc.annual) })}
      />
      <Tile tone="accent" label={m.cautiousLabel} value={calc.cautious} detail={fill(m.cautiousDetail, { annual: usd(calc.cautious * 12) })} />
    </div>
  );
}

function Tile({ tone, label, value, detail }: { tone: "leak" | "accent"; label: string; value: number; detail?: string }) {
  const perMonth = useConfig().copy.money.perMonth;
  const leak = tone === "leak";
  // Texto chico sobre naranja: siempre negro (highlight-ink), nunca gris.
  const soft = leak ? "text-highlight-ink" : "text-muted";
  return (
    // Dinero que se escapa: campo naranja con texto negro. Escenario cauteloso: panel con borde y barra turquesa.
    <div className={`px-[18px] py-3.5 ${leak ? "bg-leak text-highlight-ink" : "border-2 border-l-[6px] border-line border-l-accent bg-card"}`}>
      <div className={`label-mono ${soft}`}>{label}</div>
      <div className="numeral mt-1.5 text-[clamp(26px,5vw,34px)]">
        {usd(value)}
        <span className="text-[0.5em] font-bold"> {perMonth}</span>
      </div>
      {detail && <div className={`mt-1 text-sm ${soft}`}>{detail}</div>}
    </div>
  );
}
