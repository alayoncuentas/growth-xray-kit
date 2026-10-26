import { describe, expect, it } from "vitest";
import { getConfig } from "./config";
import { afterBusiness, businessFirst, needsBusinessStep, nextAfter, stepHref } from "./flow";

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
