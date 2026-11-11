"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EvidenceItemCard, MythCard } from "@/components/insight/InsightCard";
import { OptionList } from "@/components/question/OptionList";
import { QuestionViewed } from "@/components/question/QuestionViewed";
import { SaveForLater } from "@/components/question/SaveForLater";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/field";
import { getPhase2Config } from "@/lib/config";
import { useConfig, useLang } from "@/lib/i18n";
import { getQuestion2, insight2For, nextAfter2, phase2Href, phase2StoreKey, progress2 } from "@/lib/phase2";
import type { Situation } from "@/lib/scoring";
import { getDiagnostic, setAnswer, useDiagnostic, useSaveFailed } from "@/lib/store";
import { completePhase, queueSave } from "@/lib/sync";
import type { Answers, Phase2Config } from "@/lib/types";
import { Phase2Progress } from "./Phase2Progress";

const AUTO_ADVANCE_MS = 380;

/** La pregunta como si se mostrara (vista previa de una condicional sin las respuestas que la abren). */
const forceVisible = (cfg: Phase2Config, qid: string): Phase2Config => ({
  ...cfg,
  questions: cfg.questions.map((q) => (q.id === qid ? { ...q, showIf: undefined } : q)),
});

/**
 * Una pregunta de la fase 2 por pantalla (docs/SPEC.md §4). Guarda al momento con `phase: 2`; al cerrar el bloque
 * guarda con `complete` (el servidor cierra la fase solo si no falta nada) y lleva a la pausa del bloque.
 */
export function Phase2QuestionScreen({
  code,
  qid,
  situation,
  query,
  open = false,
}: {
  code: string;
  qid: string;
  situation: Situation;
  /** Vista previa: la muestra de la fase 1 (?sample=…), para que los enlaces la conserven. */
  query: string;
  open?: boolean;
}) {
  const router = useRouter();
  const key = phase2StoreKey(code);
  const { answers } = useDiagnostic(key);
  const saveFailed = useSaveFailed();
  const [going, setGoing] = useState(false);
  const cfg1 = useConfig();
  const cfg = getPhase2Config(useLang());
  const c = cfg1.copy.question;
  const f = cfg.copy.flow;
  const q = getQuestion2(cfg, qid)!;
  const p = progress2(cfg, answers, situation, qid) ?? progress2(forceVisible(cfg, qid), answers, situation, qid)!;
  const block = cfg.blocks[p.blockIndex];

  const prevHref = p.prev ? phase2Href(cfg, code, { kind: "question", qid: p.prev.id }, query) : `/x/${encodeURIComponent(code)}/results${query}`;
  const a = answers[q.id];
  const insight = insight2For(cfg, cfg1, q, a);

  const insightRef = useRef<HTMLDivElement>(null);
  const justSelected = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!justSelected.current || !insight) return;
    justSelected.current = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    insightRef.current?.firstElementChild?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [insight]);

  /** Siguiente paso con las respuestas más recientes (una respuesta puede abrir o cerrar una condicional). */
  async function go(latest: Answers) {
    const step = nextAfter2(cfg, latest, situation, q.id);
    if (step.kind === "pause") {
      setGoing(true);
      await completePhase(code, q.id, latest[q.id] ?? "", 2);
    }
    router.push(phase2Href(cfg, code, step, query));
  }

  function toggle(optionId: string) {
    const latest = getDiagnostic(key).answers;
    const cur = latest[q.id];
    let next: string | string[];
    if (q.type === "multi") {
      const set = new Set(Array.isArray(cur) ? cur : []);
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      next = [...set];
    } else {
      next = optionId;
    }
    setAnswer(key, q.id, next);
    queueSave(code, q.id, next, 0, 2);
    justSelected.current = true;

    // Como en la fase 1: una respuesta única sin tarjeta avanza sola.
    const after: Answers = { ...latest, [q.id]: next };
    clearTimeout(timer.current);
    if (q.type === "single" && !insight2For(cfg, cfg1, q, next)) {
      timer.current = setTimeout(() => void go(after), AUTO_ADVANCE_MS);
    }
  }

  const answered = Array.isArray(a) ? a.length > 0 : !!a;

  return (
    <>
      <QuestionViewed code={code} qid={qid} phase={2} />
      <Phase2Progress p={p} total={cfg.blocks.length} />
      <section>
        {p.firstOfBlock && block && <p className="mb-4 text-ink-2">{block.intro}</p>}
        <h1 className="mb-2 text-[clamp(22px,4.4vw,30px)]">{q.prompt}</h1>
        {q.sub && <p className="mb-[22px] text-muted">{q.sub}</p>}

        <OptionList question={q} value={a} onToggle={toggle} />
        <div ref={insightRef} aria-live="polite">
          {insight?.kind === "evidence" && <EvidenceItemCard item={insight.evidence} />}
          {insight?.kind === "myth" && <MythCard id={insight.myth} />}
        </div>

        <div className="mt-[26px] flex items-center justify-between gap-2.5">
          <ButtonLink href={prevHref} variant="ghost">
            {p.prev ? c.back : f.backToResults}
          </ButtonLink>
          <Button type="button" disabled={!answered || going} onClick={() => void go(getDiagnostic(key).answers)}>
            {c.next}
          </Button>
        </div>
        <div className="mt-5 text-right">
          <SaveForLater code={code} open={open} />
        </div>
        {saveFailed && (
          <ErrorText role="status" className="mt-3 justify-end">
            {c.saveError}
          </ErrorText>
        )}
      </section>
    </>
  );
}
