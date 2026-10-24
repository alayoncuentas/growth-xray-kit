"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { copy, phase1 } from "@/lib/config";
import { firstQuestion } from "@/lib/flow";
import { useDiagnostic } from "@/lib/store";
import type { Company } from "@/lib/types";
import { ResultsBody } from "./ResultsBody";
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

  return (
    <>
      <ResultsBody answers={answers} calc={calc} company={company} eyebrow={t.eyebrow} />

      <UnlockPanel code={code} />

      <div className="mt-[26px]">
        <ButtonLink href={firstHref} variant="ghost">
          {t.redo}
        </ButtonLink>
      </div>
    </>
  );
}
