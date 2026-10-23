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
