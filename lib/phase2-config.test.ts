import { describe, expect, it } from "vitest";
import { getPhase2Config, LANGS, phase1, phase2 } from "./config";
import type { AnswerMatch, FindingWhen, Phase2BlockId } from "./types";

// Reglas de forma de config/phase2.config.json (docs/SPEC.md §4). La paridad EN / ES está en lib/config.test.ts.

const BLOCKS: Phase2BlockId[] = ["journey", "pipeline", "retention", "reviews", "marketing", "visibility", "team", "tech"];
const PILLARS = new Set(phase1.pillars.map((p) => p.id));
const P1_PILLARS = new Set(phase1.pillars.filter((p) => p.phase === 1).map((p) => p.id));
const SITUATIONS = new Set(["leak", "demand", "offer", "scale"]);
const qById = new Map(phase2.questions.map((q) => [q.id, q]));
const p1ById = new Map(phase1.questions.map((q) => [q.id, q]));

/** Cada id de pregunta y de opción que nombra una regla existe en su fase. */
function checkMatch(m: AnswerMatch | undefined, phase: 1 | 2, where: string) {
  for (const [qid, ids] of Object.entries(m ?? {})) {
    const q = phase === 2 ? qById.get(qid) : p1ById.get(qid);
    expect(q, `${where}: pregunta ${qid}`).toBeDefined();
    const opts = q && "options" in q ? q.options.map((o) => o.id) : [];
    for (const id of ids) expect(opts, `${where}: ${qid}.${id}`).toContain(id);
  }
}

describe("fase 2: bloques y preguntas", () => {
  it("8 bloques en orden, cada uno con 3 o más preguntas", () => {
    expect(phase2.blocks.map((b) => b.id)).toEqual(BLOCKS);
    for (const b of BLOCKS) expect(phase2.questions.filter((q) => q.block === b).length, b).toBeGreaterThanOrEqual(3);
  });

  it("ids únicos, sin chocar con los de la fase 1, y opciones únicas en cada pregunta", () => {
    const ids = phase2.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(p1ById.has(id), id).toBe(false);
    for (const q of phase2.questions) expect(new Set(q.options.map((o) => o.id)).size, q.id).toBe(q.options.length);
  });

  it("las preguntas de un bloque van seguidas, en el orden de los bloques", () => {
    const order = phase2.questions.map((q) => BLOCKS.indexOf(q.block));
    expect(order.every((b, i) => i === 0 || b >= order[i - 1])).toBe(true);
  });

  it("puntajes: pilares que existen, valores de 0 a 100; las preguntas multi no puntúan", () => {
    for (const q of phase2.questions)
      for (const o of q.options) {
        if (q.type === "multi") expect(o.scores, `${q.id}.${o.id}`).toBeUndefined();
        for (const [p, v] of Object.entries(o.scores ?? {})) {
          expect(PILLARS.has(p as never), `${q.id}.${o.id}: ${p}`).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
        for (const v of Object.values(o.team ?? {})) expect(v >= 0 && v <= 100, `${q.id}.${o.id}`).toBe(true);
      }
  });

  it("presupuesto y decisión solo en el bloque 8, y el presupuesto y la decisión puntúan solo para el equipo", () => {
    for (const q of phase2.questions) {
      if (q.kind) expect(q.block, q.id).toBe("tech");
      const usesMoney = q.options.some((o) => o.team?.budget !== undefined || o.team?.decision !== undefined);
      if (usesMoney) {
        expect(q.kind, q.id).toBeDefined();
        for (const o of q.options) expect(o.scores, `${q.id}.${o.id}`).toBeUndefined();
      }
    }
    expect(phase2.questions.filter((q) => q.kind === "budget").length).toBe(1);
    expect(phase2.questions.filter((q) => q.kind === "decision").length).toBe(1);
  });

  it("presupuesto: corte exacto en $400 al mes, con el flag lowBudget solo en el rango de abajo", () => {
    for (const l of LANGS) {
      const q = getPhase2Config(l).questions.find((x) => x.kind === "budget")!;
      const low = q.options.filter((o) => o.flags?.includes("lowBudget"));
      expect(low.map((o) => o.id)).toEqual(["lt400"]);
      expect(q.options.find((o) => o.id === "lt400")!.label).toMatch(/\$400/);
      expect(q.options.find((o) => o.id === "400_1500")!.label).toMatch(/\$400/);
      // Que quede claro que es un monto mensual.
      expect(q.prompt).toMatch(l === "en" ? /per month/ : /al mes/);
      for (const o of q.options.filter((o) => o.id !== "plan")) expect(o.label, `${l}.${o.id}`).toMatch(l === "en" ? /a month$/ : /al mes$/);
    }
  });

  it("cada componente del equipo sale de las preguntas previstas", () => {
    const from = (c: string) => phase2.questions.filter((q) => q.options.some((o) => o.team && c in o.team)).map((q) => q.id);
    expect(from("capacity")).toEqual(["t_runner", "t_absorb"]);
    expect(from("decision")).toEqual(["k_decide"]);
    expect(from("budget")).toEqual(["k_budget"]);
    expect(from("timeline")).toEqual(["k_when"]);
  });

  it("showIf: situaciones válidas y preguntas anteriores que existen", () => {
    for (const q of phase2.questions) {
      const s = q.showIf;
      if (!s) continue;
      for (const x of s.situation ?? []) expect(SITUATIONS.has(x), q.id).toBe(true);
      const before = (id: string) => phase2.questions.findIndex((x) => x.id === id) < phase2.questions.indexOf(q);
      if (s.answered) expect(before(s.answered), q.id).toBe(true);
      checkMatch(s.notAnswer, 2, `showIf ${q.id}`);
      for (const id of Object.keys(s.notAnswer ?? {})) expect(before(id), q.id).toBe(true);
    }
  });

  it("insights: la evidencia y los mitos existen, y toda evidencia tiene fuente y url https", () => {
    for (const q of phase2.questions) {
      const i = q.insight;
      if (!i) continue;
      if (i.kind === "evidence") expect(phase2.evidence[i.evidence!] ?? phase1.evidence[i.evidence!], q.id).toBeDefined();
      if (i.kind === "myth") expect(phase1.myths[i.myth!], q.id).toBeDefined();
      for (const o of i.options ?? []) expect(q.options.map((x) => x.id), q.id).toContain(o);
    }
    for (const l of LANGS)
      for (const [k, e] of Object.entries(getPhase2Config(l).evidence)) {
        expect(e.source, k).toBeTruthy();
        expect(e.url, k).toMatch(/^https:\/\//);
        expect(e.source).toBe(phase2.evidence[k].source);
      }
  });
});

describe("fase 2: mini-hallazgos", () => {
  it("cada bloque tiene reglas y la última es \"*\" (y es la única)", () => {
    for (const b of BLOCKS) {
      const rules = phase2.findings[b];
      expect(rules?.length, b).toBeGreaterThanOrEqual(2);
      expect(rules.at(-1)!.when, b).toBe("*");
      expect(rules.filter((r) => r.when === "*").length, b).toBe(1);
    }
  });

  it("las condiciones nombran preguntas, opciones, pilares y flags que existen", () => {
    const flags = new Set(phase2.questions.flatMap((q) => q.options.flatMap((o) => o.flags ?? [])));
    for (const b of BLOCKS)
      phase2.findings[b].forEach((r, i) => {
        const w = r.when as Exclude<FindingWhen, "*">;
        if (r.when === "*") return;
        const where = `${b}[${i}]`;
        checkMatch(w.answer, 2, where);
        checkMatch(w.notAnswer, 2, where);
        checkMatch(w.p1, 1, where);
        checkMatch(w.p1Not, 1, where);
        if (w.p1Lowest) expect(P1_PILLARS.has(w.p1Lowest), where).toBe(true);
        for (const p of Object.keys(w.p1Below ?? {})) expect(P1_PILLARS.has(p as never), where).toBe(true);
        for (const s of w.situation ?? []) expect(SITUATIONS.has(s), where).toBe(true);
        if (w.flag) expect(flags.has(w.flag), where).toBe(true);
      });
  });

  it("los textos solo usan los marcadores que hay (closeOf10)", () => {
    for (const l of LANGS)
      for (const b of BLOCKS)
        for (const r of getPhase2Config(l).findings[b])
          for (const m of r.text.match(/\{\w+\}/g) ?? []) expect(m, `${l}.${b}`).toBe("{closeOf10}");
  });

  it("el bloque 8 no menciona presupuesto ni decisión en sus mini-hallazgos", () => {
    for (const r of phase2.findings.tech) {
      const w = r.when === "*" ? {} : r.when;
      expect(Object.keys(w.answer ?? {})).not.toContain("k_budget");
      expect(Object.keys(w.answer ?? {})).not.toContain("k_decide");
      expect(r.text).not.toMatch(/\$|budget|decide/i);
    }
  });
});
