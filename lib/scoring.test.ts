import { describe, expect, it } from "vitest";
import { phase1 as cfg, phase2 as cfg2 } from "./config";
import {
  adLeakPerThousand,
  adSpend,
  archetype,
  averageIndex,
  calcValues,
  capacityNote,
  cautiousAnnual,
  customersBucket,
  indexBand,
  lockedPillars,
  lostCustomersPerYear,
  moneyTone,
  noFollowupShare,
  notYet,
  phase1Result,
  pillarScores,
  pillarsWeakestFirst,
  rankFixes,
  scaleConfirmed,
  showsLossDetail,
  situation,
  SMALL_STAKES_ANNUAL,
  stepPlan,
  teamScores,
  unansweredShare,
  visibleQuestions,
  blockFinding,
  combinedPillars,
  finalReadiness,
  LOW_BUDGET_READINESS_CAP,
  managedFit,
  MANAGED_FIT_MIN,
  phase2Flags,
  phase2Result,
  pillarChanges,
  readinessRaw,
  READINESS_WEIGHTS,
  teamComponents,
  visibleQuestions2,
  type FindingContext,
} from "./scoring";
import { sampleState } from "./preview";
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

describe("cantidades sugeridas", () => {
  it("sin respuestas: 15 % sin respuesta el mismo día y 15 % de las atendidas sin seguimiento", () => {
    expect(unansweredShare({})).toBeCloseTo(0.15);
    expect(noFollowupShare({})).toBe(0.15);
  });

  it("seguimiento según followup", () => {
    expect(noFollowupShare({ followup: "auto" })).toBe(0.03);
    expect(noFollowupShare({ followup: "set" })).toBe(0.08);
    expect(noFollowupShare({ followup: "once" })).toBe(0.2);
    expect(noFollowupShare({ followup: "wait" })).toBe(0.35);
  });

  it("las tres demoras se combinan como unión, no se suman", () => {
    expect(unansweredShare({ speed: "5m", afterhours: "book", busy: "a" })).toBeCloseTo(0.02);
    expect(unansweredShare({ speed: "day", afterhours: "none" })).toBeCloseTo(1 - 0.9 * 0.9); // 0.19, no 0.20
    expect(unansweredShare({ speed: "dk", afterhours: "none", busy: "d" })).toBeCloseTo(1 - 0.75 * 0.9 * 0.95);
  });

  it("tope del 60 %", () => {
    expect(unansweredShare({ speed: "next", afterhours: "dk", busy: "d" })).toBeCloseTo(1 - 0.6 * 0.88 * 0.95); // 0.4984
    expect(unansweredShare({ speed: "next", afterhours: "dk", busy: "d" })).toBeLessThanOrEqual(0.6);
  });
});

describe("calcValues", () => {
  it("valores iniciales: consultas según el equipo, cantidades sugeridas, 2 de 10, $1,500", () => {
    const c = calcValues(cfg, leakyDental);
    expect(c.weekly).toBe(15); // team 2_5
    expect(c.unanswered).toBe(3); // 15 × 0.19 = 2.85
    expect(c.noFollowup).toBe(2); // (15 − 3) × 0.20 = 2.4
    expect(c.suggested).toEqual({ unanswered: true, noFollowup: true });
    expect(c.closeOf10).toBe(2);
    expect(c.value).toBe(1500);
    expect(c.lostWeek).toBe(5);
    expect(c.missed).toBeCloseTo((5 * 52) / 12);
    expect(c.annual).toBe(78_000); // 5 × 52 × 2/10 × 1,500
    expect(c.monthly).toBe(6500);
    expect(c.cautious).toBe(1625);
    // Equivalentes para la vista del equipo y el aviso de anuncios
    expect(c.inquiries).toBeCloseTo(65);
    expect(c.leak).toBeCloseTo(100 / 3);
    expect(c.close).toBe(20);
    expect(c.adLeak).toBeCloseTo((2000 * 5) / 15);
  });

  it("consultas iniciales según el tamaño del equipo", () => {
    const weekly = (team?: string) => calcValues(cfg, team ? { team } : {}).weekly;
    expect([weekly("1"), weekly("2_5"), weekly("6_15"), weekly("16_50"), weekly("50p"), weekly()]).toEqual([8, 15, 30, 60, 120, 15]);
  });

  it("los valores que mueve el dueño reemplazan a los iniciales y dejan de ser sugeridos", () => {
    const c = calcValues(cfg, leakyDental, { weekly: 20, unanswered: 4, noFollowup: 6, closeOf10: 3, value: 1000 });
    expect(c.suggested).toEqual({ unanswered: false, noFollowup: false });
    expect(c.lostWeek).toBe(10);
    expect(c.annual).toBe(156_000); // 10 × 52 × 3/10 × 1,000
  });

  it("las sugerencias siguen a las consultas mientras el dueño no las mueve", () => {
    const c = calcValues(cfg, leakyDental, { weekly: 40 });
    expect(c.unanswered).toBe(8); // 40 × 0.19 = 7.6
    expect(c.noFollowup).toBe(6); // 32 × 0.20 = 6.4
  });

  it("sin seguimiento se sugiere sobre las atendidas reales, aunque el dueño haya movido las sin respuesta", () => {
    const c = calcValues(cfg, leakyDental, { weekly: 20, unanswered: 10 });
    expect(c.suggested).toEqual({ unanswered: false, noFollowup: true });
    expect(c.noFollowup).toBe(2); // (20 − 10) × 0.20
  });

  it("una consulta cuenta una sola vez: sin respuesta ≤ consultas y sin seguimiento ≤ atendidas", () => {
    const c = calcValues(cfg, {}, { weekly: 10, unanswered: 30, noFollowup: 5 });
    expect(c.unanswered).toBe(10);
    expect(c.noFollowup).toBe(0);
    const d = calcValues(cfg, {}, { weekly: 10, unanswered: 4, noFollowup: 9 });
    expect(d.noFollowup).toBe(6);
    expect(d.lostWeek).toBeLessThanOrEqual(d.weekly);
  });

  it("recorta a los límites del config", () => {
    const c = calcValues(cfg, {}, { weekly: 0, closeOf10: 12, value: 50 });
    expect([c.weekly, c.closeOf10, c.value]).toEqual([1, 10, 100]);
  });

  it("mes = semana × 52/12, y la cifra anual es exacta", () => {
    const c = calcValues(cfg, {}, { weekly: 3, unanswered: 1, noFollowup: 0, closeOf10: 1, value: 100 });
    expect(c.annual).toBe(520);
    expect(c.monthly * 12).toBeCloseTo(520);
    expect(c.missed * 12).toBeCloseTo(52);
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
  it("con demanda baja no dice \"more advertising\"", () => {
    expect(notYet({ pipeline: 60 }, 50, 0, "silent", "demand")).toEqual(["customApp"]);
    expect(notYet({ pipeline: 60 }, 50, 0, "silent", "offer")).toEqual(["moreAds", "customApp"]);
  });
});

// Calculadora con las cantidades fijadas: semana, sin respuesta, sin seguimiento, de cada 10, valor.
const nums = (weekly: number, unanswered: number, noFollowup: number, value = 1500, closeOf10 = 2) =>
  calcValues(cfg, {}, { weekly, unanswered, noFollowup, value, closeOf10 });

describe("situation", () => {
  it("el tope de dinero es $30,000 al año", () => {
    expect(SMALL_STAKES_ANNUAL).toBe(30_000);
  });

  // Tabla del análisis (2026-11-02): 8 consultas por semana con 1 perdida.
  it.each([
    ["8, 1 perdida, $1,500, 2 de 10 (el caso)", nums(8, 1, 0), 15_600, "demand"],
    ["8, 0 perdidas", nums(8, 0, 0), 0, "demand"],
    ["10, 1 perdida", nums(10, 0, 1), 15_600, "demand"],
    ["8, 2 perdidas", nums(8, 1, 1), 31_200, "leak"],
    ["8, 1 perdida, 4 de 10", nums(8, 1, 0, 1500, 4), 31_200, "leak"],
    ["8, 1 perdida, ticket alto $5,000", nums(8, 1, 0, 5000), 52_000, "leak"],
    ["12, 1 perdida", nums(12, 1, 0), 15_600, "leak"],
    ["18, 1 perdida", nums(18, 1, 0), 15_600, "leak"],
    ["perfil una persona (8, 2 + 1)", nums(8, 2, 1), 46_800, "leak"],
  ] as const)("%s", (_, c, annual, expected) => {
    expect(c.annual).toBe(annual);
    expect(situation(c, 50)).toBe(expected);
  });

  it("demand: ≤ 4 consultas con poco en juego; borde de 4 y 5 consultas", () => {
    expect(situation(nums(4, 1, 0), 50)).toBe("demand");
    expect(situation(nums(4, 1, 0, 1900, 3), 50)).toBe("demand"); // $29,640
    expect(situation(nums(5, 1, 1), 50)).toBe("leak"); // 5 por semana y 2 perdidas: $31,200
    expect(situation(nums(5, 1, 1, 1000), 50)).toBe("leak"); // $20,800, pero 5 consultas y 2 perdidas: ni ≤ 4 ni ≤ 1 perdida
    expect(situation(nums(5, 1, 0, 1000), 50)).toBe("demand"); // 5 consultas y 1 perdida
  });

  it("borde del dinero: $29,640 es demand, $30,420 no", () => {
    expect(nums(4, 1, 0, 1900, 3).annual).toBe(29_640);
    expect(nums(4, 1, 0, 1950, 3).annual).toBe(30_420);
    expect(situation(nums(4, 1, 0, 1950, 3), 50)).toBe("leak");
    expect(situation(nums(8, 1, 0, 1950, 3), 50)).toBe("leak");
  });

  it("ticket alto con pocas consultas: leak (1 perdida ya son $52,000)", () => {
    expect(nums(3, 1, 0, 5000).annual).toBe(52_000);
    expect(situation(nums(3, 1, 0, 5000), 50)).toBe("leak");
  });

  it("offer: ≥ 5 consultas, valor < $300 y poco en juego; bordes de $299/$300", () => {
    expect(situation(nums(5, 1, 1, 250), 50)).toBe("offer");
    expect(situation(nums(15, 3, 2, 299), 50)).toBe("offer");
    expect(situation(nums(15, 3, 2, 300), 50)).toBe("leak");
    // demand gana: 4 consultas con valor bajo
    expect(situation(nums(4, 1, 1, 250), 50)).toBe("demand");
  });

  it("scale confirmado: ≥ 20 consultas, ≤ 10 % perdidas e índice ≥ 70", () => {
    const ok = nums(20, 1, 1, 5000); // 10 %, $104,000
    expect(situation(ok, 70)).toBe("scale");
    expect(scaleConfirmed(ok, 70)).toBe(true);
    expect(situation(ok, 69)).toBe("leak");
    expect(situation(nums(20, 2, 1, 5000), 80)).toBe("leak"); // 15 %
    expect(situation(nums(19, 1, 0, 5000), 80)).toBe("leak"); // 19 por semana
    expect(scaleConfirmed(nums(19, 1, 0, 5000), 80)).toBe(false);
  });

  it("con 0 perdidas nunca es leak", () => {
    expect(situation(nums(15, 0, 0), 40)).toBe("scale");
    expect(scaleConfirmed(nums(15, 0, 0), 40)).toBe(false);
    expect(situation(nums(30, 0, 0), 80)).toBe("scale");
    expect(scaleConfirmed(nums(30, 0, 0), 80)).toBe(true);
    expect(situation(nums(15, 0, 0, 200), 40)).toBe("offer");
    expect(situation(nums(8, 0, 0), 90)).toBe("demand");
    for (const weekly of [1, 4, 5, 10, 11, 19, 20, 100, 500]) {
      for (const value of [100, 299, 300, 25_000]) expect(situation(nums(weekly, 0, 0, value), 30)).not.toBe("leak");
    }
  });
});

describe("moneyTone y capacityNote", () => {
  it("panel naranja solo en leak con $30,000 o más", () => {
    expect(moneyTone("leak", nums(8, 1, 1))).toBe("leak"); // $31,200
    expect(moneyTone("leak", nums(12, 1, 0))).toBe("neutral"); // $15,600
    expect(moneyTone("scale", nums(20, 1, 1, 5000))).toBe("neutral");
    expect(moneyTone("demand", nums(3, 0, 0))).toBe("neutral");
  });
  it("nota de capacidad en demand si trabaja solo o el pilar del dueño ≤ 25", () => {
    expect(capacityNote("demand", { team: "1" }, {})).toBe(true);
    expect(capacityNote("demand", { team: "2_5" }, { owner: 25 })).toBe(true);
    expect(capacityNote("demand", { team: "2_5" }, { owner: 50 })).toBe(false);
    expect(capacityNote("leak", { team: "1" }, {})).toBe(false);
  });
});

describe("stepPlan", () => {
  const ps = { access: 37, pipeline: 15, followup: 35, reputation: 50, owner: 25 };
  const fixes = rankFixes(ps, "silent"); // pipeline, owner, followup

  it("leak: el pilar más débil primero y el resto en \"Then\"", () => {
    expect(stepPlan("leak", false, ps, fixes)).toEqual({
      first: { kind: "pillar", pillar: "pipeline", score: 15 },
      then: [
        { pillar: "owner", score: 25 },
        { pillar: "followup", score: 35 },
      ],
    });
  });

  it("scale sin confirmar: los pilares, no el paso de escalar", () => {
    expect(stepPlan("scale", false, ps, fixes).first).toEqual({ kind: "pillar", pillar: "pipeline", score: 15 });
    expect(stepPlan("scale", false, {}, []).first).toBeNull();
  });

  it("scale confirmado y offer: el paso de la situación y hasta 2 en \"Then\"", () => {
    expect(stepPlan("scale", true, ps, fixes)).toEqual({ first: { kind: "situation", situation: "scale" }, then: fixes.slice(0, 2) });
    expect(stepPlan("offer", false, ps, fixes).first).toEqual({ kind: "situation", situation: "offer" });
    expect(stepPlan("offer", false, ps, fixes).then).toHaveLength(2);
  });

  it("demand: la reputación primero si está < 70; si no, el paso de demanda", () => {
    const plan = stepPlan("demand", false, ps, fixes);
    expect(plan.first).toEqual({ kind: "pillar", pillar: "reputation", score: 50 });
    expect(plan.then.map((f) => f.pillar)).toEqual(["pipeline", "owner"]);
    const strong = { ...ps, reputation: 70 };
    expect(stepPlan("demand", false, strong, rankFixes(strong, "silent")).first).toEqual({ kind: "situation", situation: "demand" });
  });
});

describe("phase1Result: situación", () => {
  it("incluye la situación, el plan y el tono de la cifra", () => {
    const r = phase1Result(cfg, { team: "1" }, { weekly: 3, unanswered: 0, noFollowup: 0 });
    expect(r.situation).toBe("demand");
    expect(r.moneyTone).toBe("neutral");
    expect(r.capacityNote).toBe(true);
    expect(phase1Result(cfg, leakyDental).situation).toBe("leak");
    expect(phase1Result(cfg, leakyDental).moneyTone).toBe("leak");
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
    const c = calcValues(cfg, a, { weekly: 46, value: 10000 } /* ≈ 199 al mes */);
    const t = teamScores(cfg, a, pillarScores(cfg, a), 50, c);
    expect(t.potential).toBe(100);
    expect(t.readiness).toBe(85);
  });

  it("veredictos y alertas de un negocio de una persona, poco volumen", () => {
    const a: Answers = { team: "1", speed: "dk", away: "cant" };
    const ps = pillarScores(cfg, a);
    const c = calcValues(cfg, a, { weekly: 2, value: 200 }); // ≈ 9 al mes
    const t = teamScores(cfg, a, ps, averageIndex(ps), c);
    // demand: veredicto propio, y demandLimited reemplaza a lowVolume
    expect(t.verdict).toBe("demand");
    expect(t.flags).toEqual(["unmeasured", "demandLimited", "ownerBottleneck", "solo"]);
  });

  it("demand no llega a \"high\" aunque el ticket sea alto", () => {
    // 3 por semana, 0 perdidas, $10,000, con anuncios y equipo: Potential 10 + 35 + 15 + 10 = 70
    const a: Answers = { team: "2_5", ads: "1_3", tracking: "crm" };
    const c = calcValues(cfg, a, { weekly: 3, unanswered: 0, noFollowup: 0, value: 10000 });
    const t = teamScores(cfg, a, {}, 30, c);
    expect(t.potential).toBe(70);
    expect(t.verdict).toBe("demand");
  });

  it("offer: veredicto propio y alerta lowTicket", () => {
    const a: Answers = { team: "2_5", ads: "1_3", tracking: "crm" };
    const c = calcValues(cfg, a, { weekly: 30, unanswered: 5, noFollowup: 3, value: 150 }); // $24,960
    const t = teamScores(cfg, a, {}, 30, c);
    expect(t.verdict).toBe("offer");
    expect(t.flags).toContain("lowTicket");
    expect(t.flags).not.toContain("demandLimited");
  });

  it("scaleReady solo si el índice y el volumen lo confirman", () => {
    const a: Answers = { team: "6_15" };
    expect(teamScores(cfg, a, {}, 80, nums(30, 1, 1, 2500)).flags).toContain("scaleReady");
    expect(teamScores(cfg, a, {}, 40, nums(15, 0, 0)).flags).not.toContain("scaleReady");
  });

  it("scale solo declarado: veredicto máximo selective y alerta declaredNoLoss (muestra noLoss)", () => {
    const s = sampleState("noLoss");
    const r = phase1Result(cfg, s.answers, s.calc);
    expect([r.situation, r.scaleConfirmed]).toEqual(["scale", false]);
    const t = teamScores(cfg, s.answers, r.pillars, r.avg, r.calc);
    // Need 52 y Potential 68: sin el tope sería "high" (Readiness 65)
    expect([t.need, t.potential, t.readiness]).toEqual([52, 68, 65]);
    expect(t.verdict).toBe("selective");
    expect(t.flags).toContain("declaredNoLoss");
    expect(t.flags).not.toContain("scaleReady");
    // nurture también baja a selective; prepare y low no cambian
    expect(teamScores(cfg, { team: "1" }, {}, 30, calcValues(cfg, { team: "1" }, { weekly: 35, unanswered: 0, noFollowup: 0, value: 8000 })).verdict).toBe("selective");
    expect(teamScores(cfg, {}, {}, 30, nums(15, 0, 0, 300)).verdict).toBe("prepare");
    // confirmado: sin la alerta
    expect(teamScores(cfg, { team: "6_15" }, {}, 80, nums(30, 0, 0)).flags).not.toContain("declaredNoLoss");
  });

  it("lowVolume sigue cuando hay pocas consultas pero mucho en juego (no es demand)", () => {
    const t = teamScores(cfg, {}, {}, 50, nums(3, 1, 0, 5000));
    expect(t.flags).toContain("lowVolume");
    expect(t.flags).not.toContain("demandLimited");
  });

  it("selective y low cuando Need < 50", () => {
    const a: Answers = { team: "6_15", ads: "3_10" };
    const hi = calcValues(cfg, a, { weekly: 28, value: 6000 } /* ≈ 121 al mes */);
    expect(teamScores(cfg, a, {}, 80, hi).verdict).toBe("selective");
    // 15 por semana, 5 perdidas, $1,500: leak con Potential 30 + 28 = 58
    const lo = nums(15, 3, 2);
    expect(teamScores(cfg, {}, {}, 80, lo).verdict).toBe("low");
  });

  it("nurture cuando la preparación es baja", () => {
    const a: Answers = { team: "1" };
    const c = calcValues(cfg, a, { weekly: 35, value: 8000 });
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

describe("cifras derivadas de la pantalla de resultados", () => {
  // 15 consultas por semana, 3 sin respuesta + 2 sin seguimiento, 2 de cada 10 compran, $1,500.
  const c = calcValues(cfg, {}, { weekly: 15, unanswered: 3, noFollowup: 2, closeOf10: 2, value: 1500 });

  it("clientes al año = lostWeek × 52 × closeOf10/10 (= missed × close% × 12)", () => {
    expect(lostCustomersPerYear(c)).toBe(52);
    expect(lostCustomersPerYear(c)).toBeCloseTo(((c.missed * c.close) / 100) * 12);
    expect(customersBucket(lostCustomersPerYear(c))).toBe("many");
  });

  it("frases de uno y de menos de uno", () => {
    expect(customersBucket(0)).toBe("few");
    expect(customersBucket(0.99)).toBe("few");
    expect(customersBucket(1)).toBe("one");
    expect(customersBucket(1.49)).toBe("one");
    expect(customersBucket(1.5)).toBe("many");
    // nada perdido: 0 clientes al año
    expect(customersBucket(lostCustomersPerYear(calcValues(cfg, {}, { weekly: 5, unanswered: 0, noFollowup: 0 })))).toBe("few");
  });

  it("de cada $1,000 en anuncios = 1,000 × lostWeek / weekly", () => {
    expect(adLeakPerThousand(c.leak)).toBe(333); // 5 de 15
    expect(adLeakPerThousand(0)).toBe(0);
    expect(adLeakPerThousand(100)).toBe(1000);
    const ads = calcValues(cfg, { ads: "1_3" }, { weekly: 20, unanswered: 4, noFollowup: 1 });
    expect(adLeakPerThousand(ads.leak)).toBe(250);
    expect(ads.adLeak).toBe(500); // $2,000 × 5/20
  });

  it("sin consultas perdidas no se muestran clientes al año ni escenario prudente", () => {
    expect(showsLossDetail(c)).toBe(true);
    expect(showsLossDetail(calcValues(cfg, {}, { weekly: 15, unanswered: 0, noFollowup: 1 }))).toBe(true);
    expect(showsLossDetail(calcValues(cfg, {}, { weekly: 15, unanswered: 0, noFollowup: 0 }))).toBe(false);
  });

  it("escenario prudente al año = cautious × 12", () => {
    expect(c.annual).toBe(78_000);
    expect(c.monthly).toBe(6500);
    expect(cautiousAnnual(c)).toBe(19_500);
  });

  it("la cifra anual más alta posible es $650,000,000", () => {
    expect(calcValues(cfg, {}, { weekly: 500, unanswered: 500, noFollowup: 0, value: 25000, closeOf10: 10 }).annual).toBe(650_000_000);
    // repartir las perdidas entre las dos cantidades no la sube: nunca pasan de las consultas de la semana
    expect(calcValues(cfg, {}, { weekly: 500, unanswered: 500, noFollowup: 500, value: 25000, closeOf10: 10 }).annual).toBe(650_000_000);
  });

  it("pilares del más débil al más fuerte; empates en el orden del config; sin los de la fase 2", () => {
    const ids = cfg.pillars.filter((p) => p.phase === 1).map((p) => p.id);
    const tie = Object.fromEntries(ids.map((id) => [id, 50]));
    expect(pillarsWeakestFirst(cfg, tie).map((p) => p.id)).toEqual(ids);
    const ps = pillarScores(cfg, leakyDental);
    const sorted = pillarsWeakestFirst(cfg, ps);
    expect(sorted.map((p) => p.score)).toEqual([...sorted.map((p) => p.score)].sort((a, b) => a - b));
    expect(sorted.length).toBe(ids.length);
    expect(sorted[0].id).toBe("pipeline");
  });

  it("pilares sin puntaje no aparecen; los de la fase 2 van aparte", () => {
    expect(pillarsWeakestFirst(cfg, { access: 40 }).map((p) => p.id)).toEqual(["access"]);
    expect(lockedPillars(cfg).map((p) => p.id)).toEqual(["retention", "visibility", "readiness"]);
  });
});

// ---------- fase 2 (docs/SPEC.md §4) ----------

/** Respuestas de la fase 2 para un caso: solo lo que importa al test; el resto queda sin responder. */
const team2 = (runner: string, absorb: string, decide: string, budget: string, when: string, extra: Answers = {}): Answers => ({
  t_runner: runner,
  t_absorb: absorb,
  k_decide: decide,
  k_budget: budget,
  k_when: when,
  ...extra,
});

describe("fase 2: preguntas visibles", () => {
  const ids = (a: Answers, sit: Parameters<typeof visibleQuestions2>[2]) => visibleQuestions2(cfg2, a, sit).map((q) => q.id);

  it("leak y scale: sin las condicionales de situación; k_why solo si probó alguna herramienta", () => {
    for (const sit of ["leak", "scale"] as const) {
      const v = ids({}, sit);
      expect(v).not.toContain("r_extras");
      expect(v).not.toContain("a_tried");
      expect(v).not.toContain("k_why");
      expect(v.length).toBe(30);
    }
    expect(ids({ k_tools: ["crm"] }, "leak")).toContain("k_why");
    expect(ids({ k_tools: ["none"] }, "leak")).not.toContain("k_why");
    expect(ids({ k_tools: [] }, "leak")).not.toContain("k_why");
  });

  it("offer agrega r_extras; demand agrega a_tried", () => {
    expect(ids({}, "offer")).toContain("r_extras");
    expect(ids({}, "offer")).not.toContain("a_tried");
    expect(ids({}, "demand")).toContain("a_tried");
    expect(ids({ k_tools: ["crm"] }, "demand").length).toBe(32);
  });
});

describe("fase 2: pilares combinados", () => {
  const a1: Answers = { tracking: "inbox", followup: "once" };

  it("cada pilar promedia los aportes de las dos fases; las multi no puntúan", () => {
    // pipeline: fase 1 tracking inbox 15 · fase 2 p_open 75, p_value 20, p_owner 60, j_steps 35.
    const a2: Answers = { p_open: "lt5", p_value: "no", p_owner: "me", j_steps: "varies", a_channels: ["gads", "meta"] };
    const ps = combinedPillars(cfg, a1, cfg2, a2, "leak");
    expect(ps.pipeline).toBe(Math.round((15 + 75 + 20 + 60 + 35) / 5));
    expect(ps.followup).toBe(35);
    expect(ps.visibility).toBe(Math.round((20 + 30) / 2));
    expect(ps.owner).toBe(20);
  });

  it("una respuesta guardada de una pregunta que ya no se muestra no cuenta", () => {
    expect(combinedPillars(cfg, a1, cfg2, { r_extras: "no" }, "leak").retention).toBeUndefined();
    expect(combinedPillars(cfg, a1, cfg2, { r_extras: "no" }, "offer").retention).toBe(30);
  });

  it("pillarChanges: solo los pilares de la fase 1 que cambiaron, con los dos valores", () => {
    expect(pillarChanges({ access: 45, pipeline: 15, followup: 35 }, { access: 45, pipeline: 41, followup: 35, retention: 70 })).toEqual([
      { id: "pipeline", was: 15, now: 41 },
    ]);
  });
});

describe("fase 2: Readiness final", () => {
  it("pesos: suman 1 (hipótesis a calibrar)", () => {
    expect(Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  // Los 5 casos de docs/PHASE2.md §Readiness, frente a la fórmula preliminar de la fase 1.
  const cases: { name: string; a1: Answers; a2: Answers; prelim: number; raw: number; final: number }[] = [
    { name: "A. solo, presupuesto < $400", a1: { team: "1", ads: "0", tracking: "paper" }, a2: team2("me", "tight", "me", "lt400", "quarter"), prelim: 40, raw: 62, final: 50 },
    { name: "B. equipo armado", a1: { team: "6_15", ads: "1_3", tracking: "crm" }, a2: team2("person", "yes", "partner", "1500_3000", "month"), prelim: 85, raw: 87, final: 87 },
    { name: "C. parece listo, no lo está", a1: { team: "2_5", ads: "lt1", tracking: "sheet" }, a2: team2("hire", "no", "other", "plan", "exploring"), prelim: 85, raw: 34, final: 34 },
    { name: "D. burned by tech", a1: { team: "2_5", ads: "3_10", tracking: "inbox" }, a2: team2("nobody", "tight", "me", "400_1500", "month", { k_tools: ["crm"], k_why: "unused" }), prelim: 70, raw: 70, final: 70 },
    { name: "E. solo, organizado", a1: { team: "1", ads: "0", tracking: "crm" }, a2: team2("me", "yes", "me", "3000p", "year"), prelim: 55, raw: 77, final: 77 },
  ];

  for (const c of cases)
    it(c.name, () => {
      const r = phase1Result(cfg, c.a1);
      expect(teamScores(cfg, c.a1, r.pillars, r.avg, r.calc).readiness).toBe(c.prelim);
      const comp = teamComponents(cfg2, c.a2, r.situation);
      const flags = phase2Flags(cfg2, c.a2, r.situation);
      expect(readinessRaw(comp)).toBe(c.raw);
      expect(finalReadiness(comp, flags)).toBe(c.final);
      expect(phase2Result(cfg, c.a1, {}, cfg2, c.a2).team.readiness).toBe(c.final);
    });

  it("tope exacto en $400: menos de $400 se limita a 50; de $400 en adelante, no", () => {
    const hi = team2("person", "yes", "me", "lt400", "month");
    expect(readinessRaw(teamComponents(cfg2, hi, "leak"))).toBeGreaterThan(LOW_BUDGET_READINESS_CAP);
    expect(finalReadiness(teamComponents(cfg2, hi, "leak"), phase2Flags(cfg2, hi, "leak"))).toBe(LOW_BUDGET_READINESS_CAP);
    const mid = { ...hi, k_budget: "400_1500" };
    expect(finalReadiness(teamComponents(cfg2, mid, "leak"), phase2Flags(cfg2, mid, "leak"))).toBe(readinessRaw(teamComponents(cfg2, mid, "leak")));
    // El tope no sube a nadie: un Readiness bajo con presupuesto bajo queda igual.
    const low = team2("nobody", "no", "other", "lt400", "exploring");
    expect(finalReadiness(teamComponents(cfg2, low, "leak"), ["lowBudget"])).toBe(readinessRaw(teamComponents(cfg2, low, "leak")));
  });

  it("sin todos los componentes no hay Readiness final y se mantiene la preliminar", () => {
    const a1: Answers = { team: "2_5", ads: "lt1", tracking: "sheet" };
    const partial = { t_runner: "hire", t_absorb: "no" };
    expect(readinessRaw(teamComponents(cfg2, partial, "leak"))).toBeNull();
    const res = phase2Result(cfg, a1, {}, cfg2, partial);
    expect(res.team.readinessFinal).toBe(false);
    expect(res.team.readiness).toBe(85);
  });

  it("el veredicto usa el Readiness final con el mismo umbral (55)", () => {
    const { answers, calc } = sampleState("leaky");
    const base = phase1Result(cfg, answers, calc);
    expect(teamScores(cfg, answers, base.pillars, base.avg, base.calc).verdict).toMatch(/high|nurture/);
    const ready = phase2Result(cfg, answers, calc, cfg2, team2("person", "yes", "me", "1500_3000", "month"));
    expect(ready.team.verdict).toBe("high");
    const lowBudget = phase2Result(cfg, answers, calc, cfg2, team2("person", "yes", "me", "lt400", "month"));
    expect(lowBudget.team.readiness).toBe(50);
    expect(lowBudget.team.verdict).toBe("nurture");
  });
});

describe("fase 2: burned by tech y servicio gestionado", () => {
  const { answers, calc } = sampleState("leaky");
  const base = team2("person", "yes", "me", "1500_3000", "month", { k_tools: ["crm", "auto"] });

  it("burned by tech no baja Readiness ni el veredicto (casos pareados)", () => {
    const still = phase2Result(cfg, answers, calc, cfg2, { ...base, k_why: "still" });
    for (const why of ["complex", "unused", "price", "results"]) {
      const burned = phase2Result(cfg, answers, calc, cfg2, { ...base, k_why: why });
      expect(burned.flags).toContain("burnedByTech");
      expect(burned.team.readiness, why).toBe(still.team.readiness);
      expect(burned.team.verdict, why).toBe(still.team.verdict);
      expect(burned.team.phase2Flags).toContain("burnedByTech");
    }
    expect(still.flags).not.toContain("burnedByTech");
  });

  it("managedFit: +40 burned, +30 yo / nadie, +20 solo, +10 no la usaban; desde 50, servicio gestionado", () => {
    expect(managedFit({ team: "2_5" }, {}, ["burnedByTech"])).toBe(40);
    expect(managedFit({ team: "2_5" }, { t_runner: "nobody" }, ["burnedByTech", "toolUnused"])).toBe(80);
    expect(managedFit({ team: "1" }, { t_runner: "me" }, [])).toBe(50);
    expect(managedFit({ team: "1" }, { t_runner: "person" }, [])).toBe(20);
    const burnedOnly = phase2Result(cfg, answers, calc, cfg2, { ...base, k_why: "price" });
    expect(burnedOnly.team.managedFit).toBeLessThan(MANAGED_FIT_MIN);
    expect(burnedOnly.team.phase2Flags).not.toContain("managedService");
    const managed = phase2Result(cfg, answers, calc, cfg2, { ...base, t_runner: "nobody", k_why: "unused" });
    expect(managed.team.phase2Flags).toContain("managedService");
  });
});

describe("fase 2: mini-hallazgos", () => {
  const p1 = phase1Result(cfg, sampleState("leaky").answers, sampleState("leaky").calc);
  const ctx = (a2: Answers, over: Partial<FindingContext> = {}): FindingContext => ({
    a1: {},
    ps1: { access: 60, pipeline: 60, followup: 60, reputation: 60, owner: 60 },
    calc: p1.calc,
    a2,
    sit: "leak",
    flags: [],
    ...over,
  });
  const text = (block: Parameters<typeof blockFinding>[1], c: FindingContext) => blockFinding(cfg2, block, c);
  const rule = (block: keyof typeof cfg2.findings, i: number) => cfg2.findings[block][i].text;

  it("bloque 1: no sabe dónde se va la gente", () => {
    expect(text("journey", ctx({ j_stuck: "dk", j_steps: "5p" }))).toBe(rule("journey", 0));
  });

  it("bloque 1, regla 2: cotización + la fase 1 dijo once o wait (followup ≤ 35); con set no aplica", () => {
    for (const f of ["once", "wait"]) expect(text("journey", ctx({ j_stuck: "quote" }, { a1: { followup: f } }))).toBe(rule("journey", 1));
    expect(text("journey", ctx({ j_stuck: "quote" }, { a1: { followup: "set" } }))).toBe(rule("journey", 5));
  });

  it("bloque 1, regla 3: antes de responder + access es el pilar más bajo (empate incluido); si no, no aplica", () => {
    const lowest = { access: 30, pipeline: 40, followup: 50, reputation: 60, owner: 70 };
    expect(text("journey", ctx({ j_stuck: "reply" }, { ps1: lowest }))).toBe(rule("journey", 2));
    expect(text("journey", ctx({ j_stuck: "reply" }, { ps1: { ...lowest, owner: 30 } }))).toBe(rule("journey", 2));
    // access ≤ 45 pero no es el más bajo: antes la regla habría afirmado algo falso.
    expect(text("journey", ctx({ j_stuck: "reply" }, { ps1: { ...lowest, access: 40, owner: 20 } }))).toBe(rule("journey", 5));
  });

  it("bloque 1: 5 pasos o más, nada después de la venta, y la regla final", () => {
    expect(text("journey", ctx({ j_steps: "5p", j_after: "nothing" }))).toBe(rule("journey", 3));
    expect(text("journey", ctx({ j_steps: "1_2", j_after: "nothing" }))).toBe(rule("journey", 4));
    expect(text("journey", ctx({ j_steps: "1_2", j_after: "plan", j_stuck: "rare" }))).toBe(rule("journey", 5));
  });

  it("bloque 3: r_extras solo cuenta en la situación offer", () => {
    expect(text("retention", ctx({ r_list: "yes", r_extras: "no" }, { sit: "offer" }))).toBe(rule("retention", 2));
    expect(text("retention", ctx({ r_list: "yes", r_extras: "no" }))).toBe(rule("retention", 4));
  });

  it("bloque 5: anuncios sin atribución solo si paga anuncios; agencia mala + seguimiento débil", () => {
    expect(text("marketing", ctx({ a_attrib: "no" }, { a1: { ads: "1_3" } }))).toBe(rule("marketing", 0));
    expect(text("marketing", ctx({ a_attrib: "no" }, { a1: { ads: "0" } }))).toBe(rule("marketing", 3));
    expect(text("marketing", ctx({ a_agency: "bad" }, { ps1: { access: 70, followup: 35 } }))).toBe(rule("marketing", 1));
    expect(text("marketing", ctx({ a_agency: "bad" }, { ps1: { access: 70, followup: 75 } }))).toBe(rule("marketing", 3));
    expect(text("marketing", ctx({ a_tried: ["nothing"] }, { sit: "demand" }))).toBe(rule("marketing", 2));
  });

  it("bloque 6: usa el {closeOf10} de la calculadora de la fase 1", () => {
    const t = text("visibility", ctx({ f_close: "estimate" }));
    expect(t).toContain(`${p1.calc.closeOf10} out of 10`);
    expect(t).not.toContain("{");
  });

  it("bloque 8: burned by tech por flag; sin respuestas, la regla final", () => {
    const a2 = { k_tools: ["crm"], k_why: "complex" };
    expect(text("tech", ctx(a2, { flags: phase2Flags(cfg2, a2, "leak") }))).toBe(rule("tech", 0));
    expect(text("tech", ctx({}))).toBe(rule("tech", 2));
  });

  it("phase2Result devuelve un mini-hallazgo por bloque, sin marcadores sin llenar", () => {
    const { answers, calc } = sampleState("leaky");
    const r = phase2Result(cfg, answers, calc, cfg2, { f_close: "no" });
    expect(Object.keys(r.findings)).toEqual(cfg2.blocks.map((b) => b.id));
    for (const t of Object.values(r.findings)) expect(t).not.toMatch(/\{\w+\}/);
  });
});
