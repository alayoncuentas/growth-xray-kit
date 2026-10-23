import { describe, expect, it } from "vitest";
import { answeredCount, resumeTarget, splitAnswers, unanswered, validateAnswer } from "./answers";
import { phase1 as cfg } from "./config";
import type { SavedState } from "./answers";

const state = (answers: SavedState["answers"], calcSaved = false): SavedState => ({ answers, calc: {}, calcSaved });

const ALL_CHOICES = {
  industry: "dental",
  team: "1",
  channels: ["phone"],
  busy: "a",
  speed: "5m",
  afterhours: "none",
  tracking: "crm",
  followup: "auto",
  reviews: "process",
  away: "flow",
  ads: "0",
};

describe("validateAnswer", () => {
  it("single: solo ids de opción existentes", () => {
    expect(validateAnswer(cfg, "busy", "a")).toBe("a");
    expect(validateAnswer(cfg, "busy", "zzz")).toBeNull();
    expect(validateAnswer(cfg, "busy", ["a"])).toBeNull();
  });

  it("multi: lista de ids, sin repetidos, puede quedar vacía", () => {
    expect(validateAnswer(cfg, "channels", ["phone", "phone", "form"])).toEqual(["phone", "form"]);
    expect(validateAnswer(cfg, "channels", [])).toEqual([]);
    expect(validateAnswer(cfg, "channels", ["phone", "nope"])).toBeNull();
    expect(validateAnswer(cfg, "channels", "phone")).toBeNull();
  });

  it("calculadora: campos conocidos dentro de su rango", () => {
    expect(validateAnswer(cfg, "numbers", {})).toEqual({});
    expect(validateAnswer(cfg, "numbers", { inquiries: 100, leak: 41 })).toEqual({ inquiries: 100, leak: 41 });
    expect(validateAnswer(cfg, "numbers", { leak: 1000 })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { hack: 1 })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { leak: "41" })).toBeNull();
    expect(validateAnswer(cfg, "numbers", null)).toBeNull();
  });

  it("rechaza preguntas desconocidas y el rubro cuando el código ya lo trae", () => {
    expect(validateAnswer(cfg, "nope", "a")).toBeNull();
    expect(validateAnswer(cfg, "industry", "dental", "dental")).toBeNull();
    expect(validateAnswer(cfg, "industry", "dental")).toBe("dental");
  });
});

describe("splitAnswers", () => {
  it("separa la calculadora del resto", () => {
    const s = splitAnswers(cfg, [
      { question_id: "busy", value: "a" },
      { question_id: "numbers", value: { leak: 30 } },
    ]);
    expect(s).toEqual({ answers: { busy: "a" }, calc: { leak: 30 }, calcSaved: true });
  });
});

describe("retomar", () => {
  it("sin respuestas: la primera pregunta visible", () => {
    expect(resumeTarget(cfg, state({}))).toEqual({ kind: "question", qid: "industry" });
    expect(resumeTarget(cfg, state({}), "dental")).toEqual({ kind: "question", qid: "team" });
  });

  it("la primera sin responder, aunque haya respuestas después (huecos)", () => {
    expect(resumeTarget(cfg, state({ team: "1", busy: "a" }), "dental")).toEqual({ kind: "question", qid: "channels" });
  });

  it("multi vacía cuenta como sin responder", () => {
    expect(unanswered(cfg, state({ team: "1", channels: [] }), "dental")[0]).toBe("channels");
  });

  it("todas las de opción respondidas: falta la calculadora hasta que se guarde", () => {
    expect(resumeTarget(cfg, state(ALL_CHOICES))).toEqual({ kind: "question", qid: "numbers" });
    expect(resumeTarget(cfg, state(ALL_CHOICES, true))).toEqual({ kind: "results" });
  });

  it("cuenta respondidas sobre las visibles", () => {
    expect(answeredCount(cfg, state({ team: "1", busy: "a" }), "dental")).toEqual({ done: 2, total: 11 });
    expect(answeredCount(cfg, state(ALL_CHOICES, true))).toEqual({ done: 12, total: 12 });
  });
});
