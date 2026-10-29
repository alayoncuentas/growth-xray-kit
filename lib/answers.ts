// Validación y forma de las respuestas guardadas. Funciones puras: las usan /api/answer y las páginas.

import { initialValue, noFollowupShare, unansweredShare, visibleQuestions } from "./scoring";
import type { Answers, CalcOverrides, CalculatorQuestion, Phase1Config } from "./types";

/**
 * Formato anterior de la calculadora (hasta 2026-10-29): consultas al mes, % que se escapa y % de cierre.
 * Las filas guardadas no se reescriben: se convierten al leer (migrateCalc). Rangos de entonces, para validar
 * lo que todavía envíe una pestaña abierta con el código anterior.
 */
const LEGACY_CALC: Record<string, [number, number]> = { inquiries: [5, 500], value: [100, 25000], leak: [0, 70], close: [5, 60] };
export type LegacyCalc = Partial<Record<"inquiries" | "value" | "leak" | "close", number>>;

export type AnswerValue = string | string[] | CalcOverrides | LegacyCalc;

/**
 * Devuelve el valor normalizado si es válido para la pregunta, o null.
 * single: id de opción · multi: lista de ids sin repetir (puede quedar vacía) ·
 * calculator: objeto con campos conocidos dentro de su rango absoluto (los límites cruzados, como "sin respuesta ≤
 * consultas", los aplica calcValues). El formato anterior se acepta tal cual y se convierte al leer.
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
  const entries = Object.entries(value);
  const num = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
  if (isLegacyCalc(value)) {
    const out: LegacyCalc = {};
    for (const [k, v] of entries) {
      const range = LEGACY_CALC[k];
      if (!range || !num(v, ...range)) return null;
      out[k as keyof LegacyCalc] = v as number;
    }
    return out;
  }
  const out: CalcOverrides = {};
  for (const [k, v] of entries) {
    const f = q.fields.find((x) => x.id === k);
    if (!f || !num(v, f.min, f.max)) return null;
    out[f.id] = v as number;
  }
  return out;
}

/** Fila del formato anterior: trae alguno de sus campos propios (value existe en los dos formatos). */
function isLegacyCalc(v: object): boolean {
  return ["inquiries", "leak", "close"].some((k) => k in v);
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Convierte una fila guardada de la calculadora al formato actual (docs/SPEC.md §3). Solo pasa lo que el usuario
 * había movido; lo demás queda con los valores iniciales nuevos.
 *   inquiries → weekly = round(inquiries × 12/52) · close → closeOf10 = round(close / 10) · value igual
 *   leak → lostWeek = round(weekly × leak%), repartido entre unanswered y noFollowup en la proporción sugerida
 */
export function migrateCalc(cfg: Phase1Config, raw: unknown, answers: Answers): CalcOverrides {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  if (!isLegacyCalc(raw)) return raw as CalcOverrides;
  const old = raw as Record<string, unknown>;
  const field = (id: string) => calculatorQuestion(cfg).fields.find((f) => f.id === id)!;
  const out: CalcOverrides = {};
  if (isNum(old.value)) out.value = old.value;
  if (isNum(old.inquiries)) out.weekly = clamp(Math.round((old.inquiries * 12) / 52), field("weekly").min, field("weekly").max);
  if (isNum(old.close)) out.closeOf10 = clamp(Math.round(old.close / 10), field("closeOf10").min, field("closeOf10").max);
  if (isNum(old.leak)) {
    const weekly = out.weekly ?? initialValue(field("weekly"), answers);
    const lost = clamp(Math.round((weekly * old.leak) / 100), 0, weekly);
    const u = unansweredShare(answers);
    const f = (1 - u) * noFollowupShare(answers);
    out.unanswered = u + f > 0 ? Math.round((lost * u) / (u + f)) : lost;
    out.noFollowup = lost - out.unanswered;
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

/** Separa las filas de `answers`: la calculadora va a `calc` (convertida al formato actual), el resto a `answers`. */
export function splitAnswers(cfg: Phase1Config, rows: { question_id: string; value: unknown }[]): SavedState {
  const calcId = calculatorQuestion(cfg).id;
  const state: SavedState = { answers: {}, calc: {}, calcSaved: false };
  let calc: unknown = {};
  for (const r of rows) {
    if (r.question_id === calcId) {
      calc = r.value;
      state.calcSaved = true;
    } else {
      state.answers[r.question_id] = r.value as string | string[];
    }
  }
  // Al final: convertir el formato anterior necesita las demás respuestas.
  state.calc = migrateCalc(cfg, calc, state.answers);
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
