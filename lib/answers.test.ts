import { describe, expect, it } from "vitest";
import { answeredCount, migrateCalc, resumeTarget, splitAnswers, unanswered, validateAnswer } from "./answers";
import { calcValues } from "./scoring";
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

  it("calculadora: campos conocidos dentro de su rango absoluto", () => {
    expect(validateAnswer(cfg, "numbers", {})).toEqual({});
    const full = { weekly: 20, unanswered: 4, noFollowup: 3, closeOf10: 2, value: 1500 };
    expect(validateAnswer(cfg, "numbers", full)).toEqual(full);
    expect(validateAnswer(cfg, "numbers", { weekly: 500 })).toEqual({ weekly: 500 });
    expect(validateAnswer(cfg, "numbers", { weekly: 501 })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { weekly: 0 })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { closeOf10: 11 })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { unanswered: -1 })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { hack: 1 })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { weekly: "20" })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { weekly: Number.NaN })).toBeNull();
    expect(validateAnswer(cfg, "numbers", null)).toBeNull();
  });

  it("calculadora: acepta tal cual el formato anterior (pestañas abiertas antes del cambio), con sus rangos", () => {
    expect(validateAnswer(cfg, "numbers", { inquiries: 100, leak: 41 })).toEqual({ inquiries: 100, leak: 41 });
    expect(validateAnswer(cfg, "numbers", { close: 20, value: 900 })).toEqual({ close: 20, value: 900 });
    expect(validateAnswer(cfg, "numbers", { leak: 1000 })).toBeNull();
    expect(validateAnswer(cfg, "numbers", { leak: "41" })).toBeNull();
    // los dos formatos mezclados no son válidos
    expect(validateAnswer(cfg, "numbers", { inquiries: 100, weekly: 20 })).toBeNull();
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
      { question_id: "numbers", value: { weekly: 12 } },
    ]);
    expect(s).toEqual({ answers: { busy: "a" }, calc: { weekly: 12 }, calcSaved: true });
  });

  it("convierte al leer una fila del formato anterior, con las respuestas aunque vengan después", () => {
    const s = splitAnswers(cfg, [
      { question_id: "numbers", value: { inquiries: 65, leak: 40 } },
      { question_id: "speed", value: "day" },
      { question_id: "afterhours", value: "none" },
      { question_id: "followup", value: "once" },
    ]);
    // weekly 15 · lostWeek = 6 · u 0.19, f 0.81 × 0.20 = 0.162 → 6 × 0.19/0.352 = 3.2
    expect(s.calc).toEqual({ weekly: 15, unanswered: 3, noFollowup: 3 });
    expect(s.calcSaved).toBe(true);
  });

  it("una calculadora guardada vacía sigue contando como respondida", () => {
    expect(splitAnswers(cfg, [{ question_id: "numbers", value: {} }])).toEqual({ answers: {}, calc: {}, calcSaved: true });
  });
});

describe("migrateCalc", () => {
  it("el formato actual pasa sin cambios", () => {
    expect(migrateCalc(cfg, { weekly: 10, closeOf10: 3 }, {})).toEqual({ weekly: 10, closeOf10: 3 });
    expect(migrateCalc(cfg, {}, {})).toEqual({});
  });

  it("valores que no son objeto quedan vacíos", () => {
    expect(migrateCalc(cfg, null, {})).toEqual({});
    expect(migrateCalc(cfg, [1], {})).toEqual({});
  });

  it("solo inquiries: consultas por semana = round(mes × 12/52), recortadas a 1–500", () => {
    expect(migrateCalc(cfg, { inquiries: 120, value: 2500 }, {})).toEqual({ weekly: 28, value: 2500 });
    expect(migrateCalc(cfg, { inquiries: 5 }, {})).toEqual({ weekly: 1 });
    expect(migrateCalc(cfg, { inquiries: 500 }, {})).toEqual({ weekly: 115 });
  });

  it("close: de cada 10 = round(close / 10), recortado a 1–10", () => {
    expect(migrateCalc(cfg, { close: 20 }, {})).toEqual({ closeOf10: 2 });
    expect(migrateCalc(cfg, { close: 25 }, {})).toEqual({ closeOf10: 3 });
    expect(migrateCalc(cfg, { close: 5 }, {})).toEqual({ closeOf10: 1 });
    expect(migrateCalc(cfg, { close: 60 }, {})).toEqual({ closeOf10: 6 });
  });

  it("leak sin inquiries: usa las consultas iniciales del tamaño del equipo", () => {
    // team 1 → 8 por semana; 50 % → 4 perdidas; sin respuestas u = 0.15, f = 0.85 × 0.15 = 0.1275 → 4 × 0.15/0.2775 = 2.2
    expect(migrateCalc(cfg, { leak: 50 }, { team: "1" })).toEqual({ unanswered: 2, noFollowup: 2 });
  });

  it("leak 0: ninguna perdida", () => {
    expect(migrateCalc(cfg, { inquiries: 60, leak: 0 }, {})).toEqual({ weekly: 14, unanswered: 0, noFollowup: 0 });
  });

  it("el dinero en juego queda cerca del anterior", () => {
    // Antes: 60 × 41 % × 20 % × $1,500 × 12 = $88,560
    const old = { inquiries: 60, leak: 41, close: 20, value: 1500 };
    const answers = { speed: "day", afterhours: "none", followup: "once" };
    const annual = calcValues(cfg, answers, migrateCalc(cfg, old, answers)).annual;
    expect(annual).toBe(6 * 52 * 2 * 150); // 14 × 41 % = 5.74 → 6 por semana: $93,600
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
