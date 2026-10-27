"use client";

import { Panel } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useConfig } from "@/lib/i18n";
import { phase1Result } from "@/lib/scoring";
import type { Answers, CalcOverrides, Company } from "@/lib/types";
import { AdCallout } from "./AdCallout";
import { ArchetypeHeader } from "./ArchetypeHeader";
import { Findings, NotYet } from "./Findings";
import { IndexMeter } from "./IndexMeter";
import { MoneyHero } from "./MoneyHero";
import { PillarBars } from "./PillarBars";

/**
 * Resultado de la fase 1 (sin estado): lo comparten la pantalla de resultados y el informe de solo lectura /r/[code].
 * Orden: arquetipo, cifra anual, anuncios, índice y pilares, qué corregir y lo que todavía no hace falta.
 * Nunca incluye la vista del equipo.
 */
export function ResultsBody({
  answers,
  calc,
  company,
  eyebrow,
  editHref = null,
}: {
  answers: Answers;
  calc: CalcOverrides;
  company: Company | null;
  eyebrow: string;
  /** Enlace a la calculadora ("Change the numbers"), dentro de "How we calculate it". */
  editHref?: string | null;
}) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  const res = phase1Result(cfg, answers, calc);
  return (
    <>
      <Eyebrow>
        {eyebrow}
        {company?.business ? ` · ${company.business}` : ""}
      </Eyebrow>
      <ArchetypeHeader archetype={res.archetype} />

      <div className="grid gap-5">
        <MoneyHero calc={res.calc} editHref={editHref} />
        {res.spend > 0 && <AdCallout leak={res.calc.leak} adLeak={res.calc.adLeak} />}
        <div className="grid gap-5 min-[761px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Panel>
            <IndexMeter avg={res.avg} band={res.band} />
          </Panel>
          <Panel title={t.pillarsTitle}>
            <PillarBars scores={res.pillars} />
          </Panel>
        </div>
        <Findings fixes={res.fixes} />
        <NotYet items={res.notYet} />
      </div>
    </>
  );
}
