import { describe, expect, it } from "vitest";
import { phase1 as cfg } from "./config";
import {
  adLeakPerThousand,
  adSpend,
  archetype,
  averageIndex,
  calcValues,
  cautiousAnnual,
  customersBucket,
  indexBand,
  lockedPillars,
  lostCustomersPerYear,
  noFollowupShare,
  notYet,
  phase1Result,
  pillarScores,
  pillarsWeakestFirst,
  rankFixes,
  teamScores,
  unansweredShare,
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
    expect(t.verdict).toBe("prepare");
    expect(t.flags).toEqual(["unmeasured", "lowVolume", "ownerBottleneck", "solo"]);
  });

  it("selective y low cuando Need < 50", () => {
    const a: Answers = { team: "6_15", ads: "3_10" };
    const hi = calcValues(cfg, a, { weekly: 28, value: 6000 } /* ≈ 121 al mes */);
    expect(teamScores(cfg, a, {}, 80, hi).verdict).toBe("selective");
    const lo = calcValues(cfg, {}, { weekly: 2, value: 200 });
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
