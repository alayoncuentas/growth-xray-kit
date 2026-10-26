import { describe, expect, it } from "vitest";
import { getQuestion, phase1 as cfg } from "./config";
import { insightFor } from "./insights";
import type { Answers } from "./types";

const q = (id: string) => getQuestion(id)!;
const ins = (id: string, answers: Answers, outside?: { lastReview: string }) => insightFor(cfg, q(id), answers, outside);

describe("insightFor", () => {
  it("nada sin respuesta o en preguntas sin insight", () => {
    expect(ins("busy", {})).toBeNull();
    expect(ins("team", { team: "1" })).toBeNull();
    expect(ins("afterhours", { afterhours: "none" })).toBeNull();
  });

  it("busy: evidencia HBR con lead positivo solo para 'a'", () => {
    expect(ins("busy", { busy: "a" })).toMatchObject({ kind: "evidence", evidence: "hbr2011", lead: "You're ahead of most businesses here." });
    expect(ins("busy", { busy: "c" })).toMatchObject({ lead: expect.stringContaining("depends on who happens to be free") });
  });

  it("speed: lead solo para dk y 5m", () => {
    expect(ins("speed", { speed: "dk" })).toMatchObject({ lead: expect.stringContaining("Not knowing is the finding") });
    expect(ins("speed", { speed: "5m" })).toMatchObject({ lead: expect.stringContaining("overestimate") });
    expect(ins("speed", { speed: "day" })).toEqual({ kind: "evidence", evidence: "insidesales2013", lead: undefined });
  });

  it("tracking: espejo solo con 3+ canales y registro informal", () => {
    const three = ["phone", "form", "google"];
    expect(ins("tracking", { channels: three, tracking: "inbox" })).toMatchObject({ kind: "mirror", text: expect.stringContaining("**3 different channels**") });
    expect(ins("tracking", { channels: three, tracking: "crm" })).toBeNull();
    expect(ins("tracking", { channels: ["phone"], tracking: "paper" })).toBeNull();
  });

  it("followup: siempre el mito 'they'll call back'", () => {
    expect(ins("followup", { followup: "auto" })).toEqual({ kind: "myth", myth: "callback" });
  });

  it("reviews: agrega la reseña vieja de la vista externa si no hay proceso", () => {
    const v = ins("reviews", { reviews: "hope" }, { lastReview: "5 months ago" });
    expect(v).toMatchObject({ kind: "evidence", extraLead: expect.stringContaining("is from 5 months ago.") });
    expect(ins("reviews", { reviews: "process" }, { lastReview: "5 months ago" })).not.toHaveProperty("extraLead");
    expect(ins("reviews", { reviews: "hope" })).not.toHaveProperty("extraLead");
  });

  it("away: texto distinto para 'flow'", () => {
    expect(ins("away", { away: "flow" })).toMatchObject({ text: expect.stringContaining("rare and valuable") });
    expect(ins("away", { away: "cant" })).toMatchObject({ text: expect.stringContaining("isn't a discipline problem") });
  });

  it("ads: balde con agujeros, arreglar primero, sólido o nada", () => {
    const weak: Answers = { busy: "d", followup: "wait" };
    const strong: Answers = { busy: "a", speed: "5m", followup: "auto" };
    expect(ins("ads", { ...weak, ads: "1_3" })).toMatchObject({ kind: "leaky", tag: "The leaky bucket", note: cfg.myths.marketing.reality });
    expect(ins("ads", { ...weak, ads: "0" })).toMatchObject({ kind: "mirror", text: expect.stringContaining("Good timing") });
    expect(ins("ads", { ...strong, ads: "lt1" })).toMatchObject({ kind: "mirror", text: expect.stringContaining("look solid") });
    expect(ins("ads", { ...strong, ads: "0" })).toBeNull();
  });
});
