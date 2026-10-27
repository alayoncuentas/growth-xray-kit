"use client";

import { fill, usd } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import type { CalcResult } from "@/lib/scoring";

/** Dos tarjetas: dinero que se escapa (naranja) y escenario cauteloso (verde azulado). */
export function MoneyAtStake({ calc, compact = false }: { calc: CalcResult; compact?: boolean }) {
  const m = useConfig().copy.money;
  return (
    <div className={`grid gap-3 min-[521px]:grid-cols-2 ${compact ? "" : "mt-4"}`}>
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

/** Solo la cifra principal (resultado parcial): sin el desglose, el escenario cauteloso ni la inversión en anuncios. */
export function MoneyHeadline({ monthly }: { monthly: number }) {
  return <Tile tone="leak" label={useConfig().copy.money.monthlyLabel} value={monthly} />;
}

function Tile({ tone, label, value, detail }: { tone: "leak" | "accent"; label: string; value: number; detail?: string }) {
  const perMonth = useConfig().copy.money.perMonth;
  return (
    <div className={`rounded-card p-4 ${tone === "leak" ? "bg-leak-soft" : "bg-accent-soft"}`}>
      <div className="label-mono text-muted">{label}</div>
      <div className={`mt-1.5 font-display text-[clamp(26px,5vw,34px)] leading-[1.1] font-bold tabular-nums ${tone === "leak" ? "text-leak" : "text-accent"}`}>
        {usd(value)}
        <span className="text-[0.5em]"> {perMonth}</span>
      </div>
      {detail && <div className="mt-1 text-[13px] text-muted">{detail}</div>}
    </div>
  );
}
