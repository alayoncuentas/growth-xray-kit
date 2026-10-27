// Lógica de puntaje de la fase 1. Funciones puras: reciben config + respuestas, no tocan estado.
// Fuente de verdad de las reglas: docs/SPEC.md §3. Si cambias una regla, actualiza el SPEC en el mismo commit.

import type {
  Answers,
  ArchetypeId,
  CalcOverrides,
  CalculatorQuestion,
  IndexBand,
  NotYetId,
  Option,
  Phase1Config,
  Phase1PillarId,
  PillarScores,
  Question,
} from "./types";

// ---------- helpers ----------

function single(answers: Answers, qid: string): string | undefined {
  const a = answers[qid];
  return typeof a === "string" ? a : undefined;
}

export function selectedOption(cfg: Phase1Config, answers: Answers, qid: string): Option | undefined {
  const q = cfg.questions.find((x) => x.id === qid);
  const a = single(answers, qid);
  if (!q || q.type === "calculator" || !a) return undefined;
  return q.options.find((o) => o.id === a);
}

// ---------- flujo ----------

/** La pregunta de rubro se omite si el código ya trae el rubro. */
export function visibleQuestions(cfg: Phase1Config, knownIndustry?: string | null): Question[] {
  return cfg.questions.filter((q) => !(q.id === "industry" && knownIndustry));
}

// ---------- pilares ----------

/** Cada pilar = promedio redondeado de los aportes de las opciones elegidas (solo preguntas single). */
export function pillarScores(cfg: Phase1Config, answers: Answers): PillarScores {
  const acc: Record<string, number[]> = {};
  for (const q of cfg.questions) {
    if (q.type !== "single") continue;
    const o = selectedOption(cfg, answers, q.id);
    if (!o?.scores) continue;
    for (const [p, v] of Object.entries(o.scores)) (acc[p] ||= []).push(v as number);
  }
  const out: PillarScores = {};
  for (const [p, arr] of Object.entries(acc)) {
    out[p as Phase1PillarId] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }
  return out;
}

/** Índice del sistema de adquisición: promedio de los pilares con puntaje (0 si no hay ninguno). */
export function averageIndex(ps: PillarScores): number {
  const vals = Object.values(ps).filter((v): v is number => typeof v === "number");
  return Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
}

export function indexBand(avg: number): IndexBand {
  return avg >= 70 ? "solid" : avg >= 45 ? "gaps" : "leaks";
}

/** Color semántico de un puntaje (tokens good / warn / bad). */
export function scoreTone(s: number): "good" | "warn" | "bad" {
  return s >= 70 ? "good" : s >= 45 ? "warn" : "bad";
}

// ---------- porcentaje que se escapa ----------

const LEAK_BASE: Record<string, number> = { auto: 8, set: 15, once: 30, wait: 40 };
const LEAK_AFTERHOURS: Record<string, number> = { none: 8, dk: 8, auto: 3 };
const LEAK_SPEED: Record<string, number> = { next: 7, dk: 7, day: 3 };

export function leakFromAnswers(answers: Answers): number {
  let l = LEAK_BASE[single(answers, "followup") ?? ""] ?? 25;
  l += LEAK_AFTERHOURS[single(answers, "afterhours") ?? ""] ?? 0;
  l += LEAK_SPEED[single(answers, "speed") ?? ""] ?? 0;
  if (single(answers, "busy") === "d") l += 5;
  return Math.max(5, Math.min(65, l));
}

export function adSpend(cfg: Phase1Config, answers: Answers): number {
  return selectedOption(cfg, answers, "ads")?.value ?? 0;
}

// ---------- calculadora ----------

export interface CalcResult {
  inquiries: number;
  value: number;
  leak: number;
  close: number;
  missed: number;
  monthly: number;
  cautious: number;
  annual: number;
  adLeak: number;
}

export const CAUTIOUS_SHARE = 0.25;

export function calcValues(cfg: Phase1Config, answers: Answers, overrides: CalcOverrides = {}): CalcResult {
  const q = cfg.questions.find((x): x is CalculatorQuestion => x.type === "calculator");
  if (!q) throw new Error("Config has no calculator question");
  const v = {} as Record<"inquiries" | "value" | "leak" | "close", number>;
  for (const f of q.fields) {
    v[f.id] = overrides[f.id] ?? (f.default === "fromAnswers" ? leakFromAnswers(answers) : f.default);
  }
  const missed = (v.inquiries * v.leak) / 100;
  const monthly = missed * (v.close / 100) * v.value;
  return {
    ...v,
    missed,
    monthly,
    cautious: monthly * CAUTIOUS_SHARE,
    annual: monthly * 12,
    adLeak: (adSpend(cfg, answers) * v.leak) / 100,
  };
}

// ---------- cifras derivadas para la pantalla de resultados ----------
// Solo presentan de otra forma lo que ya da calcValues; no cambian ningún cálculo (docs/SPEC.md §3).

/** Clientes al año ligados a las consultas que se escapan: missed × close% × 12. Sin redondear (ver customersBucket). */
export function lostCustomersPerYear(c: CalcResult): number {
  return ((c.missed * c.close) / 100) * 12;
}

/** Qué frase usar para los clientes al año: menos de uno, uno (redondeado) o varios. */
export function customersBucket(n: number): "few" | "one" | "many" {
  if (n < 1) return "few";
  return Math.round(n) === 1 ? "one" : "many";
}

/** De cada $1,000 en anuncios, cuánto paga consultas que se escapan (= 1,000 × leak%). */
export function adLeakPerThousand(leak: number): number {
  return Math.round(leak * 10);
}

/** Escenario prudente al año: cautious × 12. */
export function cautiousAnnual(c: CalcResult): number {
  return c.cautious * 12;
}

/** Pilares de la fase 1 con puntaje, del más débil al más fuerte; los empates conservan el orden del config. */
export function pillarsWeakestFirst(cfg: Phase1Config, ps: PillarScores): { id: Phase1PillarId; label: string; score: number }[] {
  return cfg.pillars
    .filter((p) => p.phase === 1 && typeof ps[p.id as Phase1PillarId] === "number")
    .map((p) => ({ id: p.id as Phase1PillarId, label: p.label, score: ps[p.id as Phase1PillarId] as number }))
    .sort((a, b) => a.score - b.score); // Array.prototype.sort es estable
}

/** Pilares que se abren en la fase 2 (fila gris con candado). */
export function lockedPillars(cfg: Phase1Config): { id: string; label: string }[] {
  return cfg.pillars.filter((p) => p.phase !== 1).map((p) => ({ id: p.id, label: p.label }));
}

// ---------- arquetipo y prioridades ----------

/** Invierte en publicidad y la primera respuesta o el seguimiento están por debajo de 55. */
export function isLeaking(ps: PillarScores, spend: number): boolean {
  return spend > 0 && ((ps.access ?? 100) < 55 || (ps.followup ?? 100) < 55);
}

export function archetype(ps: PillarScores, avg: number, spend: number): ArchetypeId {
  if (avg >= 70) return "ready";
  if (isLeaking(ps, spend)) return "leaky";
  const entries = Object.entries(ps) as [Phase1PillarId, number][];
  if (!entries.length) return "silent";
  const low = entries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  if (low === "owner") return "bottleneck";
  if (low === "reputation") return "secret";
  return "silent";
}

const ARCHETYPE_FOCUS: Partial<Record<ArchetypeId, Phase1PillarId[]>> = {
  leaky: ["access", "followup"],
  secret: ["reputation"],
  bottleneck: ["owner"],
};

/** "What to fix, in order": pilares < 70, primero los del arquetipo, luego de menor a mayor; máximo 3. */
export function rankFixes(ps: PillarScores, arch: ArchetypeId): { pillar: Phase1PillarId; score: number }[] {
  const focus = ARCHETYPE_FOCUS[arch] ?? [];
  return (Object.entries(ps) as [Phase1PillarId, number][])
    .filter(([, s]) => s < 70)
    .sort((a, b) => Number(focus.includes(b[0])) - Number(focus.includes(a[0])) || a[1] - b[1])
    .slice(0, 3)
    .map(([pillar, score]) => ({ pillar, score }));
}

/** "What you probably don't need yet": máximo 3 (adBudget y moreAds son excluyentes, así que customApp siempre entra). */
export function notYet(ps: PillarScores, avg: number, spend: number, arch: ArchetypeId): NotYetId[] {
  const out: NotYetId[] = [];
  if ((ps.pipeline ?? 100) < 50) out.push("platform");
  if (spend > 0 && arch === "leaky") out.push("adBudget");
  if (spend === 0 && avg < 60) out.push("moreAds");
  out.push("customApp");
  return out.slice(0, 3);
}

// ---------- vista del equipo (solo /admin) ----------

export type Verdict = "high" | "nurture" | "prepare" | "selective" | "low";
export type TeamFlag = "unmeasured" | "lowVolume" | "payingLeak" | "ownerBottleneck" | "solo";

export interface TeamScores {
  need: number;
  potential: number;
  readiness: number;
  verdict: Verdict;
  flags: TeamFlag[];
}

export function teamScores(cfg: Phase1Config, answers: Answers, ps: PillarScores, avg: number, c: CalcResult): TeamScores {
  const spend = adSpend(cfg, answers);
  const team = single(answers, "team");
  const hasTeam = !!team && team !== "1";

  const need = 100 - avg;
  const potential = Math.min(
    100,
    (c.inquiries >= 100 ? 40 : c.inquiries >= 50 ? 30 : c.inquiries >= 20 ? 20 : 10) +
      (c.value >= 5000 ? 35 : c.value >= 1000 ? 28 : c.value >= 300 ? 18 : 8) +
      (spend > 0 ? 15 : 0) +
      (hasTeam ? 10 : 0),
  );
  const tracking = single(answers, "tracking");
  const readiness = Math.min(
    85,
    40 + (spend > 0 ? 20 : 0) + (tracking === "crm" || tracking === "sheet" ? 15 : 0) + (hasTeam ? 10 : 0),
  );

  let verdict: Verdict;
  if (need >= 50 && potential >= 60) verdict = readiness >= 55 ? "high" : "nurture";
  else if (need >= 50) verdict = "prepare";
  else if (potential >= 60) verdict = "selective";
  else verdict = "low";

  const flags: TeamFlag[] = [];
  if (single(answers, "speed") === "dk") flags.push("unmeasured");
  if (c.inquiries < 20) flags.push("lowVolume");
  if (isLeaking(ps, spend)) flags.push("payingLeak");
  if ((ps.owner ?? 100) <= 25) flags.push("ownerBottleneck");
  if (team === "1") flags.push("solo");

  return { need, potential, readiness, verdict, flags };
}

// ---------- resumen de la fase 1 ----------

export function phase1Result(cfg: Phase1Config, answers: Answers, overrides: CalcOverrides = {}) {
  const pillars = pillarScores(cfg, answers);
  const avg = averageIndex(pillars);
  const spend = adSpend(cfg, answers);
  const arch = archetype(pillars, avg, spend);
  return {
    pillars,
    avg,
    band: indexBand(avg),
    spend,
    archetype: arch,
    fixes: rankFixes(pillars, arch),
    notYet: notYet(pillars, avg, spend, arch),
    calc: calcValues(cfg, answers, overrides),
  };
}
