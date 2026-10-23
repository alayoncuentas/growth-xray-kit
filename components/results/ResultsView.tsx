"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { copy, fill, phase1, usd } from "@/lib/config";
import { firstQuestion } from "@/lib/flow";
import { phase1Result } from "@/lib/scoring";
import { useDiagnostic } from "@/lib/store";
import type { Company } from "@/lib/types";
import { ArchetypeHeader } from "./ArchetypeHeader";
import { Findings, NotYetList } from "./Findings";
import { MoneyAtStake } from "./MoneyAtStake";
import { PillarBars } from "./PillarBars";
import { UnlockPanel } from "./UnlockPanel";

export function ResultsView({ code, company }: { code: string; company: Company | null }) {
  const { answers, calc } = useDiagnostic(code);
  const t = copy.results;
  const base = `/x/${encodeURIComponent(code)}`;
  const firstHref = `${base}/q/${firstQuestion(phase1, company?.industry).id}`;

  // Sin respuestas en memoria (p. ej. después de recargar): no inventamos un resultado.
  if (!Object.keys(answers).length) {
    return (
      <Card>
        <h1 className="mb-3 text-[clamp(26px,5vw,36px)] tracking-[-0.02em]">{t.emptyTitle}</h1>
        <p className="mb-[22px] text-muted">{t.emptySub}</p>
        <ButtonLink href={firstHref}>{t.emptyCta}</ButtonLink>
      </Card>
    );
  }

  const res = phase1Result(phase1, answers, calc);

  return (
    <>
      <Eyebrow>
        {t.eyebrow}
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

      <UnlockPanel code={code} />

      <div className="mt-[26px]">
        <ButtonLink href={firstHref} variant="ghost">
          {t.redo}
        </ButtonLink>
      </div>
    </>
  );
}
