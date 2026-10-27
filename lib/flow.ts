// Navegación de la fase 1: qué pregunta va antes/después y cuánto falta. Funciones puras.

import { visibleQuestions } from "./scoring";
import type { Phase1Config, Question } from "./types";

export interface Progress {
  sectionIndex: number;
  sectionLabel: string;
  /** Avance 0–1 dentro de cada parte. */
  perSection: number[];
  minutesLeft: number;
  prev: Question | null;
  next: Question | null;
}

export function progress(cfg: Phase1Config, qid: string, knownIndustry?: string | null): Progress | null {
  const vis = visibleQuestions(cfg, knownIndustry);
  const pos = vis.findIndex((q) => q.id === qid);
  if (pos < 0) return null;
  const q = vis[pos];
  const sectionIndex = cfg.sections.findIndex((s) => s.id === q.section);
  const perSection = cfg.sections.map((s) => {
    const qs = vis.filter((x) => x.section === s.id);
    const done = qs.filter((x) => vis.indexOf(x) < pos).length;
    return qs.length ? done / qs.length : 0;
  });
  // La calculadora es la única pregunta de su parte: el prototipo la muestra a la mitad.
  if (q.type === "calculator") perSection[sectionIndex] = 0.5;
  return {
    sectionIndex,
    sectionLabel: cfg.sections[sectionIndex]?.label ?? "",
    perSection,
    minutesLeft: Math.max(1, Math.round((vis.length - pos) * 0.75)),
    prev: vis[pos - 1] ?? null,
    next: vis[pos + 1] ?? null,
  };
}

export function firstQuestion(cfg: Phase1Config, knownIndustry?: string | null): Question {
  return visibleQuestions(cfg, knownIndustry)[0];
}

// ---------- camino abierto: datos del negocio después del rubro ----------

export const INDUSTRY_QID = "industry";

/** A dónde lleva un paso del recorrido de la fase 1. */
export type Step = { kind: "question"; qid: string } | { kind: "business" } | { kind: "results" };

/** Contexto que cambia el recorrido: el rubro que ya trae el código y si falta la pantalla de datos del negocio. */
export interface FlowContext {
  knownIndustry?: string | null;
  /** Camino abierto sin nombre todavía. Ver needsBusinessStep. */
  needsBusiness: boolean;
}

/** La pantalla de datos del negocio solo existe en el camino abierto, mientras la empresa no tenga nombre. */
export function needsBusinessStep(c: { open: boolean; business?: string | null }): boolean {
  return c.open && !c.business?.trim();
}

/** Después de responder `qid`: la pregunta siguiente; después del rubro, los datos del negocio si faltan; al final, resultados. */
export function nextAfter(cfg: Phase1Config, qid: string, ctx: FlowContext): Step {
  if (qid === INDUSTRY_QID && ctx.needsBusiness) return { kind: "business" };
  const next = progress(cfg, qid, ctx.knownIndustry)?.next;
  return next ? { kind: "question", qid: next.id } : { kind: "results" };
}

/**
 * Lo que va después de la pantalla de datos del negocio: la pregunta que sigue al rubro, o la primera si el
 * rubro ya venía con el código (entonces esa pregunta no se muestra).
 */
export function afterBusiness(cfg: Phase1Config, knownIndustry?: string | null): Step {
  const vis = visibleQuestions(cfg, knownIndustry);
  const i = vis.findIndex((q) => q.id === INDUSTRY_QID);
  const next = i < 0 ? vis[0] : vis[i + 1];
  return next ? { kind: "question", qid: next.id } : { kind: "results" };
}

/**
 * Sin nombre, solo se puede estar en el rubro: cualquier pregunta posterior (o resultados) primero pide los
 * datos del negocio. true si hay que mandar a esa pantalla antes de mostrar `qid` (null = resultados).
 */
export function businessFirst(cfg: Phase1Config, qid: string | null, ctx: FlowContext): boolean {
  if (!ctx.needsBusiness) return false;
  return qid !== INDUSTRY_QID;
}

/** Pregunta que se puede registrar como vista (`question_viewed`): existe y se muestra con el rubro que ya trae el código. */
export function isVisibleQuestion(cfg: Phase1Config, qid: unknown, knownIndustry?: string | null): qid is string {
  return typeof qid === "string" && visibleQuestions(cfg, knownIndustry).some((q) => q.id === qid);
}

// ---------- correo antes del resultado completo ----------

export type ResultsMode = "full" | "partial";

/** Parcial solo en el camino abierto sin correo. Los invitados siempre ven el resultado completo (con o sin correo). */
export function resultsMode(c: { open: boolean; hasEmail: boolean }): ResultsMode {
  return c.open && !c.hasEmail ? "partial" : "full";
}

/**
 * La pantalla del correo aparece al terminar la fase 1 si el código no tiene correo, en los dos caminos,
 * salvo que la persona la haya omitido ("Skip": resultados con ?skip=1).
 */
export function needsEmailStep(c: { hasEmail: boolean; completed: boolean; skipped: boolean }): boolean {
  return c.completed && !c.hasEmail && !c.skipped;
}

export function stepHref(code: string, s: Step): string {
  const base = `/x/${encodeURIComponent(code)}`;
  return s.kind === "question" ? `${base}/q/${s.qid}` : s.kind === "business" ? `${base}/business` : `${base}/results`;
}
