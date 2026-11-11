// Puntajes actuales de un lead para /admin (lista y detalle), calculados al leer desde las respuestas guardadas.
// La tabla `scores` es solo historial (docs/SPEC.md §8): nunca se muestra como valor actual. Funciones puras.

import { splitAnswers } from "./answers";
import { answersFromRows2 } from "./phase2";
import { phase1Result, phase2Result, teamScores, type Verdict } from "./scoring";
import type { Answers, ArchetypeId, CalcOverrides, Phase1Config, Phase2Config } from "./types";

export type AnswerRow = { question_id: string; value: unknown };

export interface CurrentScores {
  need: number;
  potential: number;
  readiness: number;
  /** Readiness final de la fase 2 (completa); si no, la preliminar de la fase 1. */
  readinessFinal: boolean;
  verdict: Verdict;
  archetype: ArchetypeId;
  monthlyAtStake: number;
  /** Alertas del equipo: las de la fase 1 y, si hay respuestas de la fase 2, las de la fase 2. */
  flags: string[];
}

/**
 * Puntajes actuales desde respuestas ya separadas: la lista y el detalle (TeamView) usan esta misma función, así que
 * siempre coinciden. Con respuestas de la fase 2 usa el resultado de las dos fases.
 */
export function scoresFrom(cfg1: Phase1Config, cfg2: Phase2Config, a1: Answers, calc: CalcOverrides, a2: Answers = {}): CurrentScores {
  if (Object.keys(a2).length) {
    const r = phase2Result(cfg1, a1, calc, cfg2, a2);
    const t = r.team;
    return {
      need: t.need,
      potential: t.potential,
      readiness: t.readiness,
      readinessFinal: t.readinessFinal,
      verdict: t.verdict,
      archetype: r.phase1.archetype,
      monthlyAtStake: Math.round(r.phase1.calc.monthly),
      flags: [...t.flags, ...t.phase2Flags],
    };
  }
  const r = phase1Result(cfg1, a1, calc);
  const t = teamScores(cfg1, a1, r.pillars, r.avg, r.calc);
  return {
    need: t.need,
    potential: t.potential,
    readiness: t.readiness,
    readinessFinal: false,
    verdict: t.verdict,
    archetype: r.archetype,
    monthlyAtStake: Math.round(r.calc.monthly),
    flags: t.flags,
  };
}

/** Desde las filas guardadas de cada sesión. null si la fase 1 no tiene respuestas. */
export function currentScores(cfg1: Phase1Config, cfg2: Phase2Config, p1Rows: AnswerRow[], p2Rows: AnswerRow[] = []): CurrentScores | null {
  if (!p1Rows.length) return null;
  const s = splitAnswers(cfg1, p1Rows);
  return scoresFrom(cfg1, cfg2, s.answers, s.calc, answersFromRows2(p2Rows));
}

/**
 * Lo que el panel lee de cada lead: las respuestas de cada sesión, nunca la tabla `scores` (un test lo exige).
 */
export const LEAD_SELECT =
  "code, status, email, expires_at, lang, created_at, email_consent_at, email_consent_version, gifts(kind, offered_at, due_at, delivered_at, delivered_by), companies(*), sessions(id, phase, started_at, completed_at, last_question_id, lang, answers(question_id, value))";
