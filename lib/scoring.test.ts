import { describe, expect, it } from "vitest";
import { phase1 as cfg } from "./config";
import {
  adSpend,
  archetype,
  averageIndex,
  calcValues,
  indexBand,
  leakFromAnswers,
  notYet,
  phase1Result,
  pillarScores,
  rankFixes,
  teamScores,
  visibleQuestions,
} from "./scoring";
import type { Answers } from "./types";

// Un negocio "promedio con fugas", usado en varios tests.
const leakyDental: Answers = {
  industry: "dental",
  team: "2_5",
  channels: ["phone", "form", "google"],
  busy: "b", // access 45
  speed: "day", // access 45
  afterhours: "none", // access 20
  tracking: "inbox", // pipeline 15
  followup: "once", // followup 35
  reviews: "some", // reputation 50
  away: "stop", // owner 25
  ads: "1_3", // $2,000
};

describe("visibleQuestions", () => {
  it("omite la pregunta de rubro si el código ya lo trae", () => {
    expect(visibleQuestions(cfg, "dental").some((q) => q.id === "industry")).toBe(false);
    expect(visibleQuestions(cfg, null)[0].id).toBe("industry");
  });
});

describe("pillarScores", () => {
  it("promedia los aportes de cada pilar y redondea", () => {
    const ps = pillarScores(cfg, leakyDental);
    expect(ps).toEqual({ access: 37, pipeline: 15, followup: 35, reputation: 50, owner: 25 });
  });

  it("una opción puede aportar a varios pilares (followup auto → pipeline también)", () => {
    const ps = pillarScores(cfg, { tracking: "crm", followup: "auto" });
    expect(ps.followup).toBe(100);
    expect(ps.pipeline).toBe(90); // (95 + 85) / 2
  });

  it("ignora preguntas sin responder y respuestas multi", () => {
    expect(pillarScores(cfg, { channels: ["phone"] })).toEqual({});
  });
});

describe("averageIndex / indexBand", () => {
  it("promedia los pilares con puntaje", () => {
    expect(averageIndex({ access: 37, pipeline: 15, followup: 35, reputation: 50, owner: 25 })).toBe(32);
  });
  it("devuelve 0 sin pilares", () => {
    expect(averageIndex({})).toBe(0);
  });
  it("clasifica en bandas 70 / 45", () => {
    expect(indexBand(70)).toBe("solid");
    expect(indexBand(69)).toBe("gaps");
    expect(indexBand(45)).toBe("gaps");
    expect(indexBand(44)).toBe("leaks");
  });
});

describe("leakFromAnswers", () => {
  it("usa 25 como base sin respuesta de seguimiento", () => {
    expect(leakFromAnswers({})).toBe(25);
  });
  it("aplica la base por followup", () => {
    expect(leakFromAnswers({ followup: "auto" })).toBe(8);
    expect(leakFromAnswers({ followup: "set" })).toBe(15);
    expect(leakFromAnswers({ followup: "once" })).toBe(30);
    expect(leakFromAnswers({ followup: "wait" })).toBe(40);
  });
  it("suma afterhours, speed y busy=d", () => {
    expect(leakFromAnswers({ followup: "set", afterhours: "auto" })).toBe(18);
    expect(leakFromAnswers({ followup: "set", afterhours: "dk", speed: "day" })).toBe(26);
    expect(leakFromAnswers({ followup: "once", afterhours: "none", speed: "next", busy: "d" })).toBe(50);
  });
  it("respeta los límites 5–65", () => {
    expect(leakFromAnswers({ followup: "wait", afterhours: "none", speed: "dk", busy: "d" })).toBe(60);
    expect(leakFromAnswers({ followup: "auto" })).toBeGreaterThanOrEqual(5);
  });
});

describe("calcValues", () => {
  it("usa los valores por defecto del config y el leak calculado", () => {
    const c = calcValues(cfg, leakyDental);
    // leak = once 30 + none 8 + day 3 = 41
    expect(c.leak).toBe(41);
    expect(c.inquiries).toBe(60);
    expect(c.missed).toBeCloseTo(24.6);
    expect(c.monthly).toBeCloseTo(24.6 * 0.2 * 1500);
    expect(c.cautious).toBeCloseTo(c.monthly * 0.25);
    expect(c.annual).toBeCloseTo(c.monthly * 12);
    expect(c.adLeak).toBeCloseTo(2000 * 0.41);
  });
  it("los valores que mueve el usuario reemplazan a los por defecto", () => {
    const c = calcValues(cfg, leakyDental, { inquiries: 100, leak: 10, close: 50, value: 1000 });
    expect(c.monthly).toBe(5000);
  });
});

describe("archetype", () => {
  it("ready si el índice ≥ 70, aunque haya publicidad", () => {
    expect(archetype({ access: 40, owner: 100 }, 70, 2000)).toBe("ready");
  });
  it("leaky si invierte y access o followup < 55", () => {
    expect(archetype({ access: 54, followup: 80, owner: 10 }, 48, 500)).toBe("leaky");
    expect(archetype({ access: 80, followup: 54 }, 67, 500)).toBe("leaky");
  });
  it("sin publicidad, decide el pilar más bajo", () => {
    expect(archetype({ access: 54, owner: 10 }, 32, 0)).toBe("bottleneck");
    expect(archetype({ access: 60, reputation: 20 }, 40, 0)).toBe("secret");
    expect(archetype({ pipeline: 5, reputation: 20 }, 13, 0)).toBe("silent");
  });
  it("silent si no hay pilares", () => {
    expect(archetype({}, 0, 0)).toBe("silent");
  });
});

describe("rankFixes", () => {
  it("solo pilares < 70, del arquetipo primero, luego de menor a mayor, máximo 3", () => {
    const ps = { access: 37, pipeline: 15, followup: 35, reputation: 50, owner: 25 };
    expect(rankFixes(ps, "leaky").map((f) => f.pillar)).toEqual(["followup", "access", "pipeline"]);
    expect(rankFixes(ps, "silent").map((f) => f.pillar)).toEqual(["pipeline", "owner", "followup"]);
    expect(rankFixes(ps, "secret")[0].pillar).toBe("reputation");
  });
  it("vacío si todo está ≥ 70", () => {
    expect(rankFixes({ access: 70, owner: 95 }, "ready")).toEqual([]);
  });
});

describe("notYet", () => {
  it("leaky con publicidad y pipeline débil", () => {
    expect(notYet({ pipeline: 15 }, 32, 2000, "leaky")).toEqual(["platform", "adBudget", "customApp"]);
  });
  it("sin publicidad e índice < 60", () => {
    expect(notYet({ pipeline: 60 }, 50, 0, "silent")).toEqual(["moreAds", "customApp"]);
  });
  it("siempre incluye customApp", () => {
    expect(notYet({ pipeline: 95 }, 90, 0, "ready")).toEqual(["customApp"]);
  });
});

describe("teamScores", () => {
  it("calcula Need, Potential, Readiness, veredicto y alertas", () => {
    const r = phase1Result(cfg, leakyDental);
    const t = teamScores(cfg, leakyDental, r.pillars, r.avg, r.calc);
    expect(t.need).toBe(68);
    expect(t.potential).toBe(30 + 28 + 15 + 10); // 83
    expect(t.readiness).toBe(40 + 20 + 0 + 10); // 70 (inbox no suma)
    expect(t.verdict).toBe("high");
    expect(t.flags).toEqual(["payingLeak", "ownerBottleneck"]); // owner 25 ≤ 25
  });

  it("topes: Potential 100, Readiness 85", () => {
    const a: Answers = { team: "16_50", tracking: "crm", ads: "10p" };
    const c = calcValues(cfg, a, { inquiries: 200, value: 10000 });
    const t = teamScores(cfg, a, pillarScores(cfg, a), 50, c);
    expect(t.potential).toBe(100);
    expect(t.readiness).toBe(85);
  });

  it("veredictos y alertas de un negocio de una persona, poco volumen", () => {
    const a: Answers = { team: "1", speed: "dk", away: "cant" };
    const ps = pillarScores(cfg, a);
    const c = calcValues(cfg, a, { inquiries: 10, value: 200 });
    const t = teamScores(cfg, a, ps, averageIndex(ps), c);
    expect(t.verdict).toBe("prepare");
    expect(t.flags).toEqual(["unmeasured", "lowVolume", "ownerBottleneck", "solo"]);
  });

  it("selective y low cuando Need < 50", () => {
    const a: Answers = { team: "6_15", ads: "3_10" };
    const hi = calcValues(cfg, a, { inquiries: 120, value: 6000 });
    expect(teamScores(cfg, a, {}, 80, hi).verdict).toBe("selective");
    const lo = calcValues(cfg, {}, { inquiries: 10, value: 200 });
    expect(teamScores(cfg, {}, {}, 80, lo).verdict).toBe("low");
  });

  it("nurture cuando la preparación es baja", () => {
    const a: Answers = { team: "1" };
    const c = calcValues(cfg, a, { inquiries: 150, value: 8000 });
    // Potential = 40 + 35 = 75; Readiness = 40
    expect(teamScores(cfg, a, {}, 30, c).verdict).toBe("nurture");
  });
});

describe("adSpend", () => {
  it("toma el valor de la opción de publicidad", () => {
    expect(adSpend(cfg, { ads: "3_10" })).toBe(6000);
    expect(adSpend(cfg, {})).toBe(0);
  });
});

describe("config", () => {
  it("toda evidencia tiene source y url", () => {
    for (const [id, e] of Object.entries(cfg.evidence)) {
      expect(e.source, id).toBeTruthy();
      expect(e.url, id).toMatch(/^https:\/\//);
    }
  });
  it("hay un hallazgo para cada pilar de la fase 1", () => {
    for (const p of cfg.pillars.filter((p) => p.phase === 1)) {
      expect(cfg.findings[p.id as keyof typeof cfg.findings], p.id).toBeDefined();
    }
  });
});
