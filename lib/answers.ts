// Validación y forma de las respuestas guardadas. Funciones puras: las usan /api/answer y las páginas.

import { visibleQuestions } from "./scoring";
import type { Answers, CalcOverrides, CalculatorQuestion, Phase1Config } from "./types";

export type AnswerValue = string | string[] | CalcOverrides;

/**
 * Devuelve el valor normalizado si es válido para la pregunta, o null.
 * single: id de opción · multi: lista de ids sin repetir (puede quedar vacía) ·
 * calculator: objeto con campos conocidos dentro de su rango.
 */
export function validateAnswer(cfg: Phase1Config, qid: string, value: unknown, knownIndustry?: string | null): AnswerValue | null {
  const q = visibleQuestions(cfg, knownIndustry).find((x) => x.id === qid);
  if (!q) return null;

  if (q.type === "single") {
    return typeof value === "string" && q.options.some((o) => o.id === value) ? value : null;
  }

  if (q.type === "multi") {
    if (!Array.isArray(value) || value.length > q.options.length) return null;
    const ids = new Set(q.options.map((o) => o.id));
    if (!value.every((v) => typeof v === "string" && ids.has(v))) return null;
    return [...new Set(value as string[])];
  }

  if (q.type !== "calculator" || typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const out: CalcOverrides = {};
  for (const [k, v] of Object.entries(value)) {
    const f = q.fields.find((x) => x.id === k);
    if (!f || typeof v !== "number" || !Number.isFinite(v) || v < f.min || v > f.max) return null;
    out[f.id] = v;
  }
  return out;
}

export function calculatorQuestion(cfg: Phase1Config): CalculatorQuestion {
  const q = cfg.questions.find((x): x is CalculatorQuestion => x.type === "calculator");
  if (!q) throw new Error("Config has no calculator question");
  return q;
}

export interface SavedState {
  answers: Answers;
  calc: CalcOverrides;
  /** La calculadora tiene fila guardada (aunque sea {}). */
  calcSaved: boolean;
}

/** Separa las filas de `answers`: la calculadora va a `calc`, el resto a `answers`. */
export function splitAnswers(cfg: Phase1Config, rows: { question_id: string; value: unknown }[]): SavedState {
  const calcId = calculatorQuestion(cfg).id;
  const state: SavedState = { answers: {}, calc: {}, calcSaved: false };
  for (const r of rows) {
    if (r.question_id === calcId) {
      state.calc = (r.value ?? {}) as CalcOverrides;
      state.calcSaved = true;
    } else {
      state.answers[r.question_id] = r.value as string | string[];
    }
  }
  return state;
}

const isAnswered = (v: Answers[string]) => (Array.isArray(v) ? v.length > 0 : !!v);

/** Preguntas visibles sin responder, en orden. La calculadora cuenta solo si está guardada. */
export function unanswered(cfg: Phase1Config, s: SavedState, knownIndustry?: string | null): string[] {
  return visibleQuestions(cfg, knownIndustry)
    .filter((q) => (q.type === "calculator" ? !s.calcSaved : !isAnswered(s.answers[q.id])))
    .map((q) => q.id);
}

/** Cuántas preguntas visibles hay respondidas (para "You answered n of N"). */
export function answeredCount(cfg: Phase1Config, s: SavedState, knownIndustry?: string | null) {
  const total = visibleQuestions(cfg, knownIndustry).length;
  return { done: total - unanswered(cfg, s, knownIndustry).length, total };
}

/**
 * Dónde retomar: la primera pregunta sin responder (no "la siguiente a la última", porque el usuario
 * pudo volver atrás y cambiar una respuesta). Si no falta nada: resultados.
 */
export function resumeTarget(cfg: Phase1Config, s: SavedState, knownIndustry?: string | null): { kind: "question"; qid: string } | { kind: "results" } {
  const left = unanswered(cfg, s, knownIndustry);
  return left.length ? { kind: "question", qid: left[0] } : { kind: "results" };
}
