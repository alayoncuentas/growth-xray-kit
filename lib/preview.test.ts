import { describe, expect, it } from "vitest";
import { getQuestion, phase1 as cfg } from "./config";
import { insightCases, preview, previewVariant, SAMPLE_IDS, sampleState } from "./preview";
import { phase1Result } from "./scoring";
import { validateAnswer } from "./answers";

const q = (id: string) => getQuestion(id)!;
const LAST = preview.company.outside!.lastReview;

describe("muestras de arquetipos", () => {
  it.each(SAMPLE_IDS)("la muestra %s da su arquetipo", (id) => {
    const s = sampleState(id);
    expect(phase1Result(cfg, s.answers, s.calc).archetype).toBe(id);
  });

  it("todas las respuestas de muestra son válidas para el config", () => {
    for (const id of SAMPLE_IDS) {
      const s = sampleState(id);
      for (const [qid, v] of Object.entries(s.answers)) expect(validateAnswer(cfg, qid, v), `${id}.${qid}`).not.toBeNull();
      expect(validateAnswer(cfg, "numbers", s.calc), `${id}.calc`).not.toBeNull();
    }
  });
});

describe("códigos de vista previa", () => {
  it("solo los dos códigos del config", () => {
    expect(previewVariant("PREVIEW")).toBe("outside");
    expect(previewVariant("PREVIEW-PLAIN")).toBe("plain");
    expect(previewVariant("RIVERA-7F3K")).toBeNull();
  });
  it("no pueden salir del generador de códigos (contienen I y O)", () => {
    expect(preview.code).toMatch(/[IO01]/);
    expect(preview.plainCode).toMatch(/[IO01]/);
  });
});

describe("insightCases", () => {
  it("busy: una fila por opción, todas con evidencia", () => {
    const cs = insightCases(cfg, q("busy"), LAST);
    expect(cs.map((c) => c.optionId)).toEqual(["a", "b", "c", "d"]);
    expect(cs.every((c) => c.context === null && c.view?.kind === "evidence")).toBe(true);
  });

  it("afterhours: sin insight → avanza sola", () => {
    expect(insightCases(cfg, q("afterhours"), LAST).every((c) => c.view === null && c.autoAdvance)).toBe(true);
  });

  it("channels (multi): sin insight y sin avance automático", () => {
    expect(insightCases(cfg, q("channels"), LAST).every((c) => c.view === null && !c.autoAdvance)).toBe(true);
  });

  it("tracking: el espejo de canales se separa por contexto solo donde cambia", () => {
    const cs = insightCases(cfg, q("tracking"), LAST);
    const inbox = cs.filter((c) => c.optionId === "inbox");
    expect(inbox.map((c) => [c.context, c.view?.kind ?? null])).toEqual([
      ["channels3", "mirror"],
      ["channels1", null],
    ]);
    expect(cs.filter((c) => c.optionId === "crm")).toEqual([expect.objectContaining({ context: null, view: null, autoAdvance: true })]);
  });

  it("reviews: con y sin vista externa", () => {
    const hope = insightCases(cfg, q("reviews"), LAST).filter((c) => c.optionId === "hope");
    expect(hope.map((c) => c.context)).toEqual(["outside", "noOutside"]);
    expect(hope[0].view).toHaveProperty("extraLead");
    expect(hope[1].view).not.toHaveProperty("extraLead");
  });

  it("ads: los 3 casos (balde, arreglar primero, sólido) y el caso sin insight", () => {
    const cs = insightCases(cfg, q("ads"), LAST);
    const kinds = (opt: string) => cs.filter((c) => c.optionId === opt).map((c) => [c.context, c.view?.kind ?? null]);
    expect(kinds("1_3")).toEqual([
      ["weak", "leaky"],
      ["strong", "mirror"],
    ]);
    expect(kinds("0")).toEqual([
      ["weak", "mirror"],
      ["strong", null],
    ]);
  });
});
