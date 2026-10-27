import { describe, expect, it } from "vitest";
import { getConfig } from "./config";
import { afterBusiness, businessFirst, calculatorId, isVisibleQuestion, needsBusinessStep, needsEmailStep, nextAfter, resultsMode, stepHref } from "./flow";

const cfg = getConfig("en");

describe("camino abierto: datos del negocio después del rubro", () => {
  it("solo hace falta en el camino abierto sin nombre", () => {
    expect(needsBusinessStep({ open: true, business: "" })).toBe(true);
    expect(needsBusinessStep({ open: true, business: "  " })).toBe(true);
    expect(needsBusinessStep({ open: true, business: "Lakeview" })).toBe(false);
    expect(needsBusinessStep({ open: false, business: "" })).toBe(false);
  });

  it("rubro → datos del negocio → la pregunta siguiente", () => {
    expect(nextAfter(cfg, "industry", { needsBusiness: true })).toEqual({ kind: "business" });
    expect(afterBusiness(cfg)).toEqual({ kind: "question", qid: "team" });
    // Con el rubro ya conocido, la pregunta de rubro no se muestra: sigue la primera visible.
    expect(afterBusiness(cfg, "dental")).toEqual({ kind: "question", qid: "team" });
    expect(nextAfter(cfg, "industry", { needsBusiness: false })).toEqual({ kind: "question", qid: "team" });
  });

  it("sin camino abierto, el recorrido es el de siempre; la última pregunta lleva a resultados", () => {
    expect(nextAfter(cfg, "team", { needsBusiness: false })).toEqual({ kind: "question", qid: "channels" });
    expect(nextAfter(cfg, "numbers", { needsBusiness: false })).toEqual({ kind: "results" });
  });

  it("sin nombre, nada después del rubro (ni resultados) se muestra antes de los datos del negocio", () => {
    const ctx = { needsBusiness: true };
    expect(businessFirst(cfg, "industry", ctx)).toBe(false);
    expect(businessFirst(cfg, "team", ctx)).toBe(true);
    expect(businessFirst(cfg, null, ctx)).toBe(true);
    expect(businessFirst(cfg, "team", { needsBusiness: false })).toBe(false);
  });

  it("links de cada paso", () => {
    expect(stepHref("AB-12", { kind: "business" })).toBe("/x/AB-12/business");
    expect(stepHref("AB-12", { kind: "question", qid: "team" })).toBe("/x/AB-12/q/team");
    expect(stepHref("AB-12", { kind: "results" })).toBe("/x/AB-12/results");
  });
});

describe("correo antes del resultado completo", () => {
  it("parcial solo en el camino abierto sin correo", () => {
    expect(resultsMode({ open: true, hasEmail: false })).toBe("partial");
    expect(resultsMode({ open: true, hasEmail: true })).toBe("full");
    // Invitados: siempre completo, con o sin correo (decisión 4).
    expect(resultsMode({ open: false, hasEmail: false })).toBe("full");
    expect(resultsMode({ open: false, hasEmail: true })).toBe("full");
  });

  it("la pantalla del correo aparece al terminar sin correo, salvo que la haya omitido", () => {
    expect(needsEmailStep({ hasEmail: false, completed: true, skipped: false })).toBe(true);
    expect(needsEmailStep({ hasEmail: false, completed: true, skipped: true })).toBe(false);
    expect(needsEmailStep({ hasEmail: true, completed: true, skipped: false })).toBe(false);
    expect(needsEmailStep({ hasEmail: false, completed: false, skipped: false })).toBe(false);
  });
});

describe("question_viewed: solo preguntas que se muestran", () => {
  it("existe y es visible con el rubro del código", () => {
    expect(isVisibleQuestion(cfg, "team")).toBe(true);
    expect(isVisibleQuestion(cfg, "industry")).toBe(true);
    // Con el rubro ya cargado por el equipo, la pregunta de rubro no se muestra.
    expect(isVisibleQuestion(cfg, "industry", "dental")).toBe(false);
  });

  it("rechaza ids inventados o que no son texto", () => {
    for (const v of ["nope", "", "results", null, 42, ["team"]]) expect(isVisibleQuestion(cfg, v)).toBe(false);
  });
});

describe("calculatorId", () => {
  it("la pregunta de la calculadora, en los dos idiomas", () => {
    expect(calculatorId(cfg)).toBe("numbers");
    expect(calculatorId(getConfig("es"))).toBe("numbers");
  });
});
