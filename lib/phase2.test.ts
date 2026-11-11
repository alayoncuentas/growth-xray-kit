import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { phase1, phase2 as cfg } from "./config";
import {
  answersFromRows2,
  blockDone,
  canEnterPhase2,
  doneBlocks,
  insight2For,
  isPhase2Block,
  nextAfter2,
  phase2Href,
  phase2StoreKey,
  progress2,
  resumeTarget2,
  unanswered2,
  validateAnswer2,
} from "./phase2";
import type { Answers } from "./types";

/** Respuestas de todas las preguntas visibles con su primera opción (multi: la primera, sin "none"). */
function allFirst(sit: Parameters<typeof unanswered2>[2], extra: Answers = {}): Answers {
  const a: Answers = { ...extra };
  for (let i = 0; i < 40; i++) {
    const left = unanswered2(cfg, a, sit);
    if (!left.length) break;
    const q = cfg.questions.find((x) => x.id === left[0])!;
    a[q.id] = q.type === "multi" ? [q.options[0].id] : q.options[0].id;
  }
  return a;
}

describe("fase 2: entrada", () => {
  it("solo con la fase 1 terminada y con correo", () => {
    expect(canEnterPhase2({ email: "a@b.co", phase1Done: true })).toBe("ok");
    expect(canEnterPhase2({ email: null, phase1Done: true })).toBe("email");
    expect(canEnterPhase2({ email: "  ", phase1Done: true })).toBe("email");
    expect(canEnterPhase2({ email: "a@b.co", phase1Done: false })).toBe("phase1");
    expect(canEnterPhase2({ email: null, phase1Done: false })).toBe("phase1");
  });
});

describe("fase 2: recorrido y retomar", () => {
  it("sin respuestas, retoma en la primera pregunta del bloque 1", () => {
    expect(resumeTarget2(cfg, {}, "leak")).toEqual({ kind: "question", qid: "j_steps" });
  });

  it("retoma en la primera pendiente aunque haya respuestas después (volvió atrás)", () => {
    expect(resumeTarget2(cfg, { j_steps: "1_2", j_after: "plan", p_open: "lt5" }, "leak")).toEqual({ kind: "question", qid: "j_stuck" });
  });

  it("dentro de un bloque sigue a la siguiente; al cerrar el bloque, la pausa", () => {
    expect(nextAfter2(cfg, {}, "leak", "j_steps")).toEqual({ kind: "question", qid: "j_stuck" });
    expect(nextAfter2(cfg, {}, "leak", "j_after")).toEqual({ kind: "pause", block: "journey" });
    expect(nextAfter2(cfg, {}, "leak", "k_when")).toEqual({ kind: "pause", block: "tech" });
  });

  it("condicionales: r_extras (offer) va antes de la pausa del bloque 3; k_why sigue a k_tools solo si probó algo", () => {
    expect(nextAfter2(cfg, {}, "offer", "r_referrals")).toEqual({ kind: "question", qid: "r_extras" });
    expect(nextAfter2(cfg, {}, "leak", "r_referrals")).toEqual({ kind: "pause", block: "retention" });
    expect(nextAfter2(cfg, { k_tools: ["crm"] }, "leak", "k_tools")).toEqual({ kind: "question", qid: "k_why" });
    expect(nextAfter2(cfg, { k_tools: ["none"] }, "leak", "k_tools")).toEqual({ kind: "question", qid: "k_decide" });
  });

  it("todo respondido: el informe; bloques terminados en orden", () => {
    for (const sit of ["leak", "demand", "offer", "scale"] as const) {
      const a = allFirst(sit);
      expect(resumeTarget2(cfg, a, sit), sit).toEqual({ kind: "report" });
      expect(doneBlocks(cfg, a, sit)).toEqual(cfg.blocks.map((b) => b.id));
    }
  });

  it("un bloque se abre otra vez si aparece una pregunta nueva (k_why después de marcar una herramienta)", () => {
    const a = allFirst("leak", { k_tools: ["none"] });
    expect(blockDone(cfg, a, "leak", "tech")).toBe(true);
    const changed = { ...a, k_tools: ["crm"] };
    expect(blockDone(cfg, changed, "leak", "tech")).toBe(false);
    expect(unanswered2(cfg, changed, "leak")).toEqual(["k_why"]);
  });
});

describe("fase 2: validación", () => {
  it("single: id de opción; multi: lista de ids sin repetir", () => {
    expect(validateAnswer2(cfg, "j_steps", "5p", {}, "leak")).toBe("5p");
    expect(validateAnswer2(cfg, "j_steps", "zz", {}, "leak")).toBeNull();
    expect(validateAnswer2(cfg, "j_steps", ["5p"], {}, "leak")).toBeNull();
    expect(validateAnswer2(cfg, "a_channels", ["gads", "gads", "meta"], {}, "leak")).toEqual(["gads", "meta"]);
    expect(validateAnswer2(cfg, "a_channels", [], {}, "leak")).toEqual([]);
    expect(validateAnswer2(cfg, "a_channels", ["zz"], {}, "leak")).toBeNull();
    expect(validateAnswer2(cfg, "a_channels", "gads", {}, "leak")).toBeNull();
  });

  it("rechaza preguntas que hoy no se muestran o que no existen", () => {
    expect(validateAnswer2(cfg, "r_extras", "no", {}, "leak")).toBeNull();
    expect(validateAnswer2(cfg, "r_extras", "no", {}, "offer")).toBe("no");
    expect(validateAnswer2(cfg, "k_why", "complex", { k_tools: ["none"] }, "leak")).toBeNull();
    expect(validateAnswer2(cfg, "k_why", "complex", { k_tools: ["crm"] }, "leak")).toBe("complex");
    expect(validateAnswer2(cfg, "team", "1", {}, "leak")).toBeNull(); // pregunta de la fase 1
  });

  it("answersFromRows2 descarta valores que no son ids", () => {
    expect(answersFromRows2([{ question_id: "j_steps", value: "5p" }, { question_id: "x", value: { a: 1 } }, { question_id: "a_channels", value: ["gads"] }])).toEqual({
      j_steps: "5p",
      a_channels: ["gads"],
    });
  });
});

describe("fase 2: migración", () => {
  it("una sola migración nueva con block_done y scores.scoring_version", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261111000000_phase2.sql"), "utf8");
    expect(sql).toContain("'block_done'");
    expect(sql).toMatch(/add column if not exists scoring_version text/);
  });
});

describe("fase 2: pantallas", () => {
  const q = (id: string) => cfg.questions.find((x) => x.id === id)!;

  it("tiempos aprobados por bloque (2026-11-11), dentro de los ~20 minutos que promete la bienvenida", () => {
    expect(Object.fromEntries(cfg.blocks.map((b) => [b.id, b.minutes]))).toEqual({
      journey: 2,
      pipeline: 2,
      retention: 3,
      reviews: 2,
      marketing: 2,
      visibility: 2,
      team: 2,
      tech: 3,
    });
    expect(cfg.blocks.reduce((s, b) => s + b.minutes, 0)).toBeLessThanOrEqual(cfg.estimatedMinutes);
  });

  it("avance: bloque, primera pregunta del bloque, anterior y minutos que faltan", () => {
    const first = progress2(cfg, {}, "leak", "j_steps")!;
    expect(first).toMatchObject({ blockIndex: 0, block: "journey", firstOfBlock: true, prev: null, minutesLeft: 18 });
    const second = progress2(cfg, {}, "leak", "j_stuck")!;
    expect(second.firstOfBlock).toBe(false);
    expect(second.prev?.id).toBe("j_steps");

    const vis = cfg.questions.filter((x) => !x.showIf);
    const firstOfPipeline = vis.find((x) => x.block === "pipeline")!;
    const p = progress2(cfg, {}, "leak", firstOfPipeline.id)!;
    expect(p).toMatchObject({ blockIndex: 1, firstOfBlock: true });
    expect(p.prev?.block).toBe("journey");
    expect(p.perBlock[0]).toBe(1);
    expect(p.perBlock.slice(1).every((f) => f === 0)).toBe(true);
  });

  it("los minutos que faltan nunca suben y nunca bajan de 1", () => {
    const a = allFirst("leak");
    const ids = cfg.questions.filter((x) => progress2(cfg, a, "leak", x.id)).map((x) => x.id);
    const mins = ids.map((id) => progress2(cfg, a, "leak", id)!.minutesLeft);
    expect(mins.every((m, i) => m >= 1 && (i === 0 || m <= mins[i - 1]))).toBe(true);
  });

  it("una pregunta condicional solo tiene avance cuando se muestra", () => {
    const extra = cfg.questions.find((x) => x.showIf?.situation?.includes("offer"))!;
    expect(progress2(cfg, {}, "leak", extra.id)).toBeNull();
    expect(progress2(cfg, {}, "offer", extra.id)).not.toBeNull();
  });

  it("enlaces: pregunta, pausa y, mientras no exista el informe, la pausa del último bloque", () => {
    expect(phase2Href(cfg, "AB 12", { kind: "question", qid: "j_steps" })).toBe("/x/AB%2012/phase-2/q/j_steps");
    expect(phase2Href(cfg, "C", { kind: "pause", block: "team" }, "?sample=offer")).toBe("/x/C/phase-2/b/team?sample=offer");
    expect(phase2Href(cfg, "C", { kind: "report" })).toBe("/x/C/phase-2/b/tech");
    expect(isPhase2Block(cfg, "tech")).toBe(true);
    expect(isPhase2Block(cfg, "nope")).toBe(false);
  });

  it("el estado del navegador de la fase 2 no se mezcla con el de la fase 1", () => {
    expect(phase2StoreKey("C")).not.toBe("C");
  });

  it("tarjeta después de responder: evidencia con fuente y URL, y el mito solo con la opción indicada", () => {
    expect(insight2For(cfg, phase1, q("r_repeat"), undefined)).toBeNull();
    const ev = insight2For(cfg, phase1, q("r_repeat"), "often");
    expect(ev?.kind).toBe("evidence");
    if (ev?.kind === "evidence") {
      expect(ev.evidence.source).toBeTruthy();
      expect(ev.evidence.url).toMatch(/^https:\/\//);
    }
    const agency = q("a_agency");
    const bad = agency.insight!.options![0];
    const other = agency.options.find((o) => !agency.insight!.options!.includes(o.id))!.id;
    expect(insight2For(cfg, phase1, agency, bad)).toEqual({ kind: "myth", myth: agency.insight!.myth });
    expect(insight2For(cfg, phase1, agency, other)).toBeNull();
  });

  it("toda pregunta con tarjeta encuentra su evidencia o su mito", () => {
    for (const x of cfg.questions.filter((y) => y.insight)) {
      const value = x.insight!.options?.[0] ?? x.options[0].id;
      expect(insight2For(cfg, phase1, x, x.type === "multi" ? [value] : value), x.id).not.toBeNull();
    }
  });
});
