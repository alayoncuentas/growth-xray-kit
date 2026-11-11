// Navegación y validación de la fase 2 (docs/SPEC.md §4). Funciones puras: las usan /api/answer y las páginas.

import { visibleQuestions2, type Situation } from "./scoring";
import type { Answers, Phase2BlockId, Phase2Config, Phase2Question } from "./types";

/** Quién puede entrar a la fase 2: un código con correo y con la fase 1 terminada. Si no, a dónde va. */
export type Phase2Gate = "ok" | "email" | "phase1";

export function canEnterPhase2(c: { email: string | null | undefined; phase1Done: boolean }): Phase2Gate {
  if (!c.phase1Done) return "phase1";
  if (!c.email?.trim()) return "email";
  return "ok";
}

const isAnswered = (v: Answers[string]) => (Array.isArray(v) ? v.length > 0 : !!v);

/** Preguntas visibles sin responder, en orden. */
export function unanswered2(cfg: Phase2Config, answers: Answers, sit: Situation): string[] {
  return visibleQuestions2(cfg, answers, sit)
    .filter((q) => !isAnswered(answers[q.id]))
    .map((q) => q.id);
}

/** Un bloque está terminado cuando todas sus preguntas visibles tienen respuesta. */
export function blockDone(cfg: Phase2Config, answers: Answers, sit: Situation, block: Phase2BlockId): boolean {
  return visibleQuestions2(cfg, answers, sit)
    .filter((q) => q.block === block)
    .every((q) => isAnswered(answers[q.id]));
}

/** Bloques terminados, en orden. */
export function doneBlocks(cfg: Phase2Config, answers: Answers, sit: Situation): Phase2BlockId[] {
  return cfg.blocks.map((b) => b.id).filter((b) => blockDone(cfg, answers, sit, b));
}

export type Phase2Step = { kind: "question"; qid: string } | { kind: "pause"; block: Phase2BlockId } | { kind: "report" };

/**
 * Dónde retomar: la primera pregunta visible sin responder (no "la siguiente a la última", porque pudo volver atrás);
 * si no falta ninguna, el informe.
 */
export function resumeTarget2(cfg: Phase2Config, answers: Answers, sit: Situation): Phase2Step {
  const left = unanswered2(cfg, answers, sit);
  return left.length ? { kind: "question", qid: left[0] } : { kind: "report" };
}

/**
 * Después de responder `qid`: la siguiente pregunta visible del mismo bloque; al cerrar el bloque, la pausa con el
 * mini-hallazgo; después del último bloque, también la pausa (el informe va después de esa pausa).
 */
export function nextAfter2(cfg: Phase2Config, answers: Answers, sit: Situation, qid: string): Phase2Step {
  const vis = visibleQuestions2(cfg, answers, sit);
  const pos = vis.findIndex((q) => q.id === qid);
  if (pos < 0) return resumeTarget2(cfg, answers, sit);
  const q = vis[pos];
  const next = vis[pos + 1];
  if (next && next.block === q.block) return { kind: "question", qid: next.id };
  return { kind: "pause", block: q.block };
}

export function getQuestion2(cfg: Phase2Config, qid: string): Phase2Question | undefined {
  return cfg.questions.find((q) => q.id === qid);
}

/**
 * Valor normalizado si es válido para una pregunta visible de la fase 2, o null.
 * single: id de opción · multi: lista de ids sin repetir (puede quedar vacía). La visibilidad se mira con las demás
 * respuestas guardadas: no se acepta la respuesta a una pregunta que hoy no se muestra.
 */
export function validateAnswer2(cfg: Phase2Config, qid: string, value: unknown, answers: Answers, sit: Situation): string | string[] | null {
  const q = visibleQuestions2(cfg, answers, sit).find((x) => x.id === qid);
  if (!q) return null;
  if (q.type === "single") return typeof value === "string" && q.options.some((o) => o.id === value) ? value : null;
  if (!Array.isArray(value) || value.length > q.options.length) return null;
  const ids = new Set(q.options.map((o) => o.id));
  if (!value.every((v) => typeof v === "string" && ids.has(v))) return null;
  return [...new Set(value as string[])];
}

/** Respuestas guardadas de la fase 2 (filas de `answers`): solo ids de opción o listas de ids. */
export function answersFromRows2(rows: { question_id: string; value: unknown }[]): Answers {
  const out: Answers = {};
  for (const r of rows) {
    if (typeof r.value === "string" || (Array.isArray(r.value) && r.value.every((v) => typeof v === "string"))) out[r.question_id] = r.value as string | string[];
  }
  return out;
}
