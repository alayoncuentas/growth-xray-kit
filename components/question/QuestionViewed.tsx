"use client";

import { useEffect } from "react";
import { markQuestionViewed } from "@/app/actions";

// Una vez por pregunta y carga de página (StrictMode monta los efectos dos veces en desarrollo; volver a una
// pregunta sin recargar no la cuenta de nuevo).
const sent = new Set<string>();

/** Registra que la pregunta se vio en el navegador (`question_viewed`), para el abandono por pregunta en el panel. */
export function QuestionViewed({ code, qid }: { code: string; qid: string }) {
  useEffect(() => {
    const key = `${code}:${qid}`;
    if (sent.has(key)) return;
    sent.add(key);
    markQuestionViewed(code, qid).catch((e) => console.warn("[question_viewed]", e));
  }, [code, qid]);
  return null;
}
