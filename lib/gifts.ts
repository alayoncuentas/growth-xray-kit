// Regalo según calificación (docs/OPEN_ENTRY.md §2). Funciones puras.
// Se decide con la vista del equipo, pero el prospecto nunca ve Need, Potential ni Readiness: solo qué regalo le tocó.

import { phase1Result, teamScores } from "./scoring";
import type { Answers, CalcOverrides, Phase1Config } from "./types";

export type GiftKind = "A" | "B";

export const isGiftKind = (v: unknown): v is GiftKind => v === "A" || v === "B";

/** A (response-time test + website review): Potential ≥ 60 y Need ≥ 50. B (Google reviews audit): el resto. */
export function giftFor(t: { need: number; potential: number }): GiftKind {
  return t.potential >= 60 && t.need >= 50 ? "A" : "B";
}

/** El regalo que tocaría con estas respuestas (antes de ofrecerlo; una vez ofrecido queda fijo). */
export function giftForAnswers(cfg: Phase1Config, answers: Answers, calc: CalcOverrides): GiftKind {
  const res = phase1Result(cfg, answers, calc);
  return giftFor(teamScores(cfg, answers, res.pillars, res.avg, res.calc));
}
