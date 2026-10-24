import { Panel } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { copy, fill, phase1, usd } from "@/lib/config";
import { phase1Result } from "@/lib/scoring";
import type { Answers, CalcOverrides, Company } from "@/lib/types";
import { ArchetypeHeader } from "./ArchetypeHeader";
import { Findings, NotYetList } from "./Findings";
import { MoneyAtStake } from "./MoneyAtStake";
import { PillarBars } from "./PillarBars";

/**
 * Resultado de la fase 1 (sin estado): lo comparten la pantalla de resultados y el informe de solo lectura /r/[code].
 * Nunca incluye la vista del equipo.
 */
export function ResultsBody({ answers, calc, company, eyebrow }: { answers: Answers; calc: CalcOverrides; company: Company | null; eyebrow: string }) {
  const t = copy.results;
  const res = phase1Result(phase1, answers, calc);
  return (
    <>
      <Eyebrow>
        {eyebrow}
        {company ? ` · ${company.business}` : ""}
      </Eyebrow>
      <ArchetypeHeader archetype={res.archetype} avg={res.avg} band={res.band} />

      <div className="grid gap-5 min-[761px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <Panel title={t.pillarsTitle}>
            <PillarBars scores={res.pillars} />
          </Panel>
          <Panel title={t.moneyTitle}>
            <MoneyAtStake calc={res.calc} compact />
            {res.spend > 0 && <p className="mt-3.5">{fill(copy.money.adLeak, { adLeak: usd(res.calc.adLeak) })}</p>}
          </Panel>
        </div>
        <div className="grid content-start gap-5">
          <Panel title={t.fixTitle}>
            <Findings fixes={res.fixes} />
          </Panel>
          <Panel title={t.notYetTitle}>
            <NotYetList items={res.notYet} />
          </Panel>
        </div>
      </div>
    </>
  );
}
