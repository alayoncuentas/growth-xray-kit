import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { phase1, phase2 } from "./config";
import { currentScores, LEAD_SELECT, scoresFrom, type AnswerRow } from "./lead-scores";
import { SAMPLE_IDS, sampleState } from "./preview";
import { phase1Result, phase2Result, SCORING_VERSION, teamScores } from "./scoring";
import type { Answers, CalcOverrides } from "./types";

// Lo que muestra la lista del panel se calcula al leer, desde las respuestas, con la misma función que el detalle
// (docs/SPEC.md §8). Estos tests comparan ese cálculo con las funciones de puntaje.

/** Filas como las guarda /api/answer: una por pregunta; la calculadora como objeto. */
function rows(answers: Answers, calc?: CalcOverrides): AnswerRow[] {
  const out: AnswerRow[] = Object.entries(answers).map(([question_id, value]) => ({ question_id, value }));
  if (calc) out.push({ question_id: "numbers", value: calc });
  return out;
}

const p2: Answers = { t_runner: "person", t_absorb: "yes", k_decide: "me", k_budget: "lt400", k_when: "month", k_tools: ["crm"], k_why: "unused", p_owner: "me" };

describe("puntajes del panel: calculados al leer", () => {
  it("el panel lee las respuestas de cada sesión, nunca la tabla scores", () => {
    expect(LEAD_SELECT).toContain("answers(question_id, value)");
    expect(LEAD_SELECT).not.toMatch(/scores\s*\(/);
  });

  it("sin respuestas de la fase 1: sin puntajes", () => {
    expect(currentScores(phase1, phase2, [], [])).toBeNull();
  });

  for (const id of SAMPLE_IDS)
    it(`fase 1, muestra ${id}: igual que phase1Result + teamScores`, () => {
      const { answers, calc } = sampleState(id);
      const r = phase1Result(phase1, answers, calc);
      const t = teamScores(phase1, answers, r.pillars, r.avg, r.calc);
      expect(currentScores(phase1, phase2, rows(answers, calc))).toEqual({
        need: t.need,
        potential: t.potential,
        readiness: t.readiness,
        readinessFinal: false,
        verdict: t.verdict,
        archetype: r.archetype,
        monthlyAtStake: Math.round(r.calc.monthly),
        flags: t.flags,
      });
    });

  it("con la fase 2: Readiness final (con el tope de $400) y las alertas de las dos fases", () => {
    const { answers, calc } = sampleState("leaky");
    const r = phase2Result(phase1, answers, calc, phase2, p2);
    const s = currentScores(phase1, phase2, rows(answers, calc), rows(p2))!;
    expect(s.readiness).toBe(r.team.readiness);
    expect(s.readiness).toBeLessThanOrEqual(50);
    expect(s.readinessFinal).toBe(true);
    expect(s.verdict).toBe(r.team.verdict);
    expect(s.flags).toEqual([...r.team.flags, ...r.team.phase2Flags]);
    expect(s.flags).toEqual(expect.arrayContaining(["burnedByTech", "lowBudget"]));
  });

  it("la lista (filas) y el detalle (respuestas separadas) dan lo mismo", () => {
    for (const id of SAMPLE_IDS) {
      const { answers, calc } = sampleState(id);
      expect(currentScores(phase1, phase2, rows(answers, calc), rows(p2)), id).toEqual(scoresFrom(phase1, phase2, answers, calc, p2));
      expect(currentScores(phase1, phase2, rows(answers, calc)), id).toEqual(scoresFrom(phase1, phase2, answers, calc));
    }
  });
});

describe("registro de cambios (SPEC §8)", () => {
  it("SCORING_VERSION es la fecha de la última fila del registro", () => {
    const spec = readFileSync(join(process.cwd(), "docs/SPEC.md"), "utf8");
    const section = spec.slice(spec.indexOf("## 8. Registro de cambios"));
    const dates = [...section.matchAll(/^\| (\d{4}-\d{2}-\d{2}) \|/gm)].map((m) => m[1]);
    expect(dates.length).toBeGreaterThan(0);
    expect(SCORING_VERSION).toBe(dates.sort().at(-1));
  });
});
