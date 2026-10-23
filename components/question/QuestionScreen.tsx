"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Insight } from "@/components/insight/InsightCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StepProgress } from "@/components/ui/StepProgress";
import { copy, getQuestion, isChoice, phase1 } from "@/lib/config";
import { progress } from "@/lib/flow";
import { insightFor } from "@/lib/insights";
import { getDiagnostic, setAnswer, useDiagnostic } from "@/lib/store";
import type { Answers, Company } from "@/lib/types";
import { Calculator } from "./Calculator";
import { OptionList } from "./OptionList";

const AUTO_ADVANCE_MS = 380;

export function QuestionScreen({ code, qid, company }: { code: string; qid: string; company: Company | null }) {
  const router = useRouter();
  const { answers } = useDiagnostic(code);
  const q = getQuestion(qid)!;
  const p = progress(phase1, qid, company?.industry)!;
  const outside = company?.outside ?? null;
  const c = copy.question;

  const base = `/x/${encodeURIComponent(code)}`;
  const prevHref = p.prev ? `${base}/q/${p.prev.id}` : base;
  const nextHref = p.next ? `${base}/q/${p.next.id}` : `${base}/results`;

  const insight = insightFor(phase1, q, answers, outside);
  const insightRef = useRef<HTMLDivElement>(null);
  const justSelected = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Al elegir una opción con insight, lo acerca a la vista (sin animación si el usuario la reduce).
  useEffect(() => {
    if (!justSelected.current || !insight) return;
    justSelected.current = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    insightRef.current?.firstElementChild?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [insight]);

  function toggle(optionId: string) {
    if (!isChoice(q)) return;
    // Estado actual del store, no el del último render: dos clics rápidos no deben pisarse.
    const latest = getDiagnostic(code).answers;
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
    setAnswer(code, q.id, next);
    justSelected.current = true;

    // Como en el prototipo: si la respuesta no trae insight, avanza solo.
    const after: Answers = { ...latest, [q.id]: next };
    clearTimeout(timer.current);
    if (q.type === "single" && !insightFor(phase1, q, after, outside)) {
      timer.current = setTimeout(() => router.push(nextHref), AUTO_ADVANCE_MS);
    }
  }

  const a = answers[q.id];
  const answered = q.type === "calculator" || (Array.isArray(a) ? a.length > 0 : !!a);

  return (
    <>
      <StepProgress p={p} />
      <section>
        <h1 className="mb-2 text-[clamp(24px,4.6vw,32px)] tracking-[-0.015em]">{q.prompt}</h1>
        {(q.sub || q.type === "calculator") && (
          <p className="mb-[22px] text-muted">{[q.sub, q.type === "calculator" ? q.prefillNote : null].filter(Boolean).join(" ")}</p>
        )}

        {isChoice(q) ? (
          <>
            <OptionList question={q} value={a} onToggle={toggle} />
            <div ref={insightRef} aria-live="polite">
              {insight && <Insight view={insight} />}
            </div>
          </>
        ) : (
          <Calculator code={code} question={q} />
        )}

        <div className="mt-[26px] flex items-center justify-between gap-2.5">
          <ButtonLink href={prevHref} variant="ghost">
            {p.prev ? c.back : c.backToStart}
          </ButtonLink>
          {answered ? (
            <ButtonLink href={nextHref}>{p.next ? c.next : c.seeResults}</ButtonLink>
          ) : (
            <Button disabled>{p.next ? c.next : c.seeResults}</Button>
          )}
        </div>
      </section>
    </>
  );
}
