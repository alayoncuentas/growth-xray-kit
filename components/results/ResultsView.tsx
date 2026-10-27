"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fill } from "@/lib/config";
import type { ResultsMode } from "@/lib/flow";
import type { GiftKind } from "@/lib/gifts";
import { useConfig } from "@/lib/i18n";
import { firstQuestion } from "@/lib/flow";
import { useDiagnostic } from "@/lib/store";
import type { Company } from "@/lib/types";
import { GiftPanel } from "./GiftPanel";
import { PartialResults } from "./PartialResults";
import { ResultsBody } from "./ResultsBody";
import { UnlockPanel } from "./UnlockPanel";

export function ResultsView({
  code,
  company,
  open = false,
  mode = "full",
  gift = "B",
  unlockedTo = null,
  offered = null,
}: {
  code: string;
  company: Company | null;
  open?: boolean;
  /** Lo decide el servidor (lib/flow.ts resultsMode): parcial solo en el camino abierto sin correo. */
  mode?: ResultsMode;
  /** Regalo que se nombra en el bloque para desbloquear el parcial. */
  gift?: GiftKind;
  /** Correo enmascarado, recién dejado desde el parcial: aviso "Unlocked…". */
  unlockedTo?: string | null;
  /** Regalo ya ofrecido (código con correo y fase terminada) y el correo enmascarado al que escribiremos. */
  offered?: { kind: GiftKind; to: string } | null;
}) {
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

  const redo = (
    <div className="mt-[26px]">
      <ButtonLink href={firstHref} variant="ghost">
        {t.redo}
      </ButtonLink>
    </div>
  );

  if (mode === "partial") {
    return (
      <>
        <PartialResults code={code} answers={answers} calc={calc} company={company} gift={gift} />
        {redo}
      </>
    );
  }

  return (
    <>
      {unlockedTo && (
        <p role="status" className="mb-5 rounded-card bg-accent-soft px-4 py-3 text-sm">
          {fill(cfg.copy.partial.after, { to: unlockedTo })}
        </p>
      )}

      <ResultsBody answers={answers} calc={calc} company={company} eyebrow={t.eyebrow} />

      {offered && <GiftPanel kind={offered.kind} to={offered.to} />}

      <UnlockPanel code={code} open={open} />

      {redo}
    </>
  );
}
