// Navegación y validación de la fase 2 (docs/SPEC.md §4). Funciones puras: las usan /api/answer y las páginas.

import { visibleQuestions2, type Situation } from "./scoring";
import type { Answers, Evidence, Phase1Config, Phase2BlockId, Phase2Config, Phase2Question } from "./types";

/** Quién puede entrar a la fase 2: un código con correo y con la fase 1 terminada. Si no, a dónde va. */
export type Phase2Gate = "ok" | "email" | "phase1";

export function canEnterPhase2(c: { email: string | null | undefined; phase1Done: boolean }): Phase2Gate {
  if (!c.phase1Done) return "phase1";
  if (!c.email?.trim()) return "email";
  return "ok";
}

const isAnswered = (v: Answers[string] | undefined) => (Array.isArray(v) ? v.length > 0 : !!v);

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

// ---------- pantallas: avance, enlaces y estado en el navegador ----------

/** Clave del store del navegador para la fase 2 (lib/store.ts guarda por clave; la fase 1 usa el código solo). */
export const phase2StoreKey = (code: string) => `p2:${code}`;

export interface Progress2 {
  blockIndex: number;
  block: Phase2BlockId;
  blockLabel: string;
  /** Avance 0–1 dentro de cada bloque. */
  perBlock: number[];
  minutesLeft: number;
  /** Primera pregunta visible del bloque: ahí va la frase de apertura. */
  firstOfBlock: boolean;
  prev: Phase2Question | null;
  next: Phase2Question | null;
}

/** Avance en la pregunta `qid` (visible), o null si hoy no se muestra. Los minutos salen de `blocks[].minutes`. */
export function progress2(cfg: Phase2Config, answers: Answers, sit: Situation, qid: string): Progress2 | null {
  const vis = visibleQuestions2(cfg, answers, sit);
  const pos = vis.findIndex((q) => q.id === qid);
  if (pos < 0) return null;
  const q = vis[pos];
  const blockIndex = cfg.blocks.findIndex((b) => b.id === q.block);
  let minutes = 0;
  const perBlock = cfg.blocks.map((b, k) => {
    const qs = vis.filter((x) => x.block === b.id);
    const done = qs.filter((x) => vis.indexOf(x) < pos).length;
    const f = qs.length ? done / qs.length : 0;
    if (k >= blockIndex) minutes += b.minutes * (1 - f);
    return f;
  });
  return {
    blockIndex,
    block: q.block,
    blockLabel: cfg.blocks[blockIndex]?.label ?? "",
    perBlock,
    minutesLeft: Math.max(1, Math.round(minutes)),
    firstOfBlock: vis[pos - 1]?.block !== q.block,
    prev: vis[pos - 1] ?? null,
    next: vis[pos + 1] ?? null,
  };
}

export function isPhase2Block(cfg: Phase2Config, id: unknown): id is Phase2BlockId {
  return typeof id === "string" && cfg.blocks.some((b) => b.id === id);
}

/**
 * Enlace de un paso de la fase 2. El informe completo llega en la etapa 5: mientras tanto, "report" lleva a la pausa
 * del último bloque. `query` conserva la muestra de la vista previa (?sample=…).
 */
export function phase2Href(cfg: Phase2Config, code: string, s: Phase2Step, query = ""): string {
  const base = `/x/${encodeURIComponent(code)}/phase-2`;
  if (s.kind === "question") return `${base}/q/${s.qid}${query}`;
  const block = s.kind === "pause" ? s.block : cfg.blocks[cfg.blocks.length - 1].id;
  return `${base}/b/${block}${query}`;
}

export type Insight2View = { kind: "evidence"; evidence: Evidence } | { kind: "myth"; myth: string };

/**
 * Tarjeta después de responder (`question.insight`): solo con respuesta y, si la regla trae `options`, solo con una de
 * ellas. La evidencia se busca en la fase 2 y, si no está, en la fase 1; el mito, en la fase 1.
 */
export function insight2For(
  cfg2: Phase2Config,
  cfg1: Pick<Phase1Config, "evidence" | "myths">,
  q: Phase2Question,
  value: Answers[string] | undefined,
): Insight2View | null {
  const ins = q.insight;
  if (!ins || !isAnswered(value)) return null;
  const picked = Array.isArray(value) ? value : [value as string];
  if (ins.options && !picked.some((v) => ins.options!.includes(v))) return null;
  if (ins.kind === "myth") return ins.myth && cfg1.myths[ins.myth] ? { kind: "myth", myth: ins.myth } : null;
  const e = ins.evidence ? (cfg2.evidence[ins.evidence] ?? cfg1.evidence[ins.evidence]) : undefined;
  return e ? { kind: "evidence", evidence: e } : null;
}
