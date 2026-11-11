"use client";

import { SaveForLater } from "@/components/question/SaveForLater";
import { Arrow, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fill, getPhase2Config } from "@/lib/config";
import { useLang } from "@/lib/i18n";
import { getQuestion2, phase2Href, phase2StoreKey, resumeTarget2 } from "@/lib/phase2";
import { blockFinding, phase2Flags, type CalcResult, type Situation } from "@/lib/scoring";
import { useDiagnostic } from "@/lib/store";
import type { Answers, Phase2BlockId, PillarScores } from "@/lib/types";
import { Phase2Progress } from "./Phase2Progress";

/**
 * Pausa al cerrar un bloque: el mini-hallazgo (la primera regla del bloque que se cumple), "Continue" a la primera
 * pregunta pendiente y "Save and finish later". Después del último bloque, el cierre de la fase 2.
 */
export function BlockPause({
  code,
  block,
  p1,
  query,
  open = false,
}: {
  code: string;
  block: Phase2BlockId;
  /** De la fase 1, solo lo que leen los mini-hallazgos (lo mismo que ya ve el prospecto en sus resultados). */
  p1: { answers: Answers; calc: CalcResult; pillars: PillarScores; situation: Situation };
  query: string;
  open?: boolean;
}) {
  const cfg = getPhase2Config(useLang());
  const f = cfg.copy.flow;
  const { answers } = useDiagnostic(phase2StoreKey(code));
  const sit = p1.situation;
  const i = cfg.blocks.findIndex((b) => b.id === block);
  const b = cfg.blocks[i];
  const finding = blockFinding(cfg, block, { a1: p1.answers, ps1: p1.pillars, calc: p1.calc, a2: answers, sit, flags: phase2Flags(cfg, answers, sit) });
  // "Continue": la primera pregunta visible sin responder (pudo volver atrás y dejar algo en otro bloque). Si no falta
  // ninguna, la fase 2 terminó.
  const target = resumeTarget2(cfg, answers, sit);
  const nextLabel = target.kind === "question" ? cfg.blocks.find((x) => x.id === getQuestion2(cfg, target.qid)?.block) : undefined;
  const finished = !nextLabel;
  const perBlock = cfg.blocks.map((_, k) => (k <= i ? 1 : 0));
  const minutesLeft = cfg.blocks.slice(i + 1).reduce((s, x) => s + x.minutes, 0);
  const results = `/x/${encodeURIComponent(code)}/results${query}`;

  return (
    <>
      <Phase2Progress
        p={{ perBlock, blockIndex: i, blockLabel: b.label, minutesLeft }}
        total={cfg.blocks.length}
        label={finished ? f.pause.finalEyebrow : fill(f.pause.eyebrow, { n: i + 1, total: cfg.blocks.length, label: b.label })}
      />
      <Card>
        <h1 className="mb-3 display text-[clamp(26px,5vw,36px)]">{f.pause.title}</h1>
        <p className="border-2 border-l-[6px] border-line border-l-accent bg-card px-[18px] py-3.5 text-lg leading-snug">{finding}</p>

        {!nextLabel ? (
          <div className="mt-[26px]">
            {/* El informe completo llega en la etapa 5; mientras tanto, vuelve a los resultados. */}
            <ButtonLink href={results}>
              {f.pause.finalCta}
              <Arrow />
            </ButtonLink>
          </div>
        ) : (
          <>
            <p className="mt-[22px] label-mono text-ink-2">{fill(f.pause.next, { label: nextLabel.label, n: nextLabel.minutes })}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
              <ButtonLink href={phase2Href(cfg, code, target, query)}>
                {f.pause.continue}
                <Arrow />
              </ButtonLink>
              <SaveForLater code={code} open={open} />
            </div>
            <p className="mt-3 text-sm text-muted">{f.pause.saved}</p>
          </>
        )}
      </Card>
    </>
  );
}
