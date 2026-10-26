"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConfig } from "@/lib/i18n";
import { firstQuestion } from "@/lib/flow";
import { useDiagnostic } from "@/lib/store";
import type { Company } from "@/lib/types";
import { ResultsBody } from "./ResultsBody";
import { UnlockPanel } from "./UnlockPanel";

export function ResultsView({ code, company, open = false }: { code: string; company: Company | null; open?: boolean }) {
  const { answers, calc } = useDiagnostic(code);
  const cfg = useConfig();
  const t = cfg.copy.results;
  const base = `/x/${encodeURIComponent(code)}`;
  const firstHref = `${base}/q/${firstQuestion(cfg, company?.industry).id}`;

  // Sin respuestas en memoria (p. ej. después de recargar): no inventamos un resultado.
  if (!Object.keys(answers).length) {
    return (
      <Card>
        <h1 className="mb-3 text-[clamp(26px,5vw,36px)] tracking-[-0.02em]">{open ? t.emptyTitleOpen : t.emptyTitle}</h1>
        <p className="mb-[22px] text-muted">{t.emptySub}</p>
        <ButtonLink href={firstHref}>{t.emptyCta}</ButtonLink>
      </Card>
    );
  }

  return (
    <>
      <ResultsBody answers={answers} calc={calc} company={company} eyebrow={t.eyebrow} />

      <UnlockPanel code={code} open={open} />

      <div className="mt-[26px]">
        <ButtonLink href={firstHref} variant="ghost">
          {t.redo}
        </ButtonLink>
      </div>
    </>
  );
}
