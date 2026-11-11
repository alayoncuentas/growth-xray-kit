// Lógica de puntaje de la fase 1. Funciones puras: reciben config + respuestas, no tocan estado.
// Fuente de verdad de las reglas: docs/SPEC.md §3. Si cambias una regla, actualiza el SPEC en el mismo commit.

import type {
  AnswerMatch,
  Answers,
  ArchetypeId,
  CalcFieldId,
  CalcOverrides,
  CalculatorField,
  CalculatorQuestion,
  IndexBand,
  NotYetId,
  Option,
  FindingWhen,
  Phase1Config,
  Phase1PillarId,
  Phase2BlockId,
  Phase2Config,
  Phase2Option,
  Phase2Question,
  PillarScores,
  Question,
  TeamComponent,
} from "./types";

/**
 * Versión de las reglas de puntaje: la fecha de la última fila de docs/SPEC.md §8 (un test lo exige). Se guarda en cada
 * foto de `scores`, que es historial: lo que se muestra siempre se calcula al leer, desde las respuestas.
 */
export const SCORING_VERSION = "2026-11-10";

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

// ---------- cantidades sugeridas ----------
// Valores iniciales de "sin respuesta el mismo día" y "cotizaciones sin seguimiento" (docs/SPEC.md §3).
// Son heurísticas para empezar, no estadísticas: el dueño las ve marcadas como sugeridas y puede cambiarlas.

// Las tres preguntas de demora describen el mismo hueco: se combinan como unión, 1 − Π(1 − p), no se suman.
const DELAY_SPEED: Record<string, number> = { "5m": 0.02, "1h": 0.05, day: 0.1, next: 0.4, dk: 0.25 };
const DELAY_SPEED_UNANSWERED = 0.15;
const DELAY_AFTERHOURS: Record<string, number> = { book: 0, auto: 0.05, none: 0.1, dk: 0.12 };
const DELAY_BUSY: Record<string, number> = { c: 0.03, d: 0.05 };
const UNANSWERED_CAP = 0.6;
// Proporción de las consultas atendidas cuya cotización queda sin seguimiento.
const NO_FOLLOWUP: Record<string, number> = { auto: 0.03, set: 0.08, once: 0.2, wait: 0.35 };
const NO_FOLLOWUP_UNANSWERED = 0.15;

/** Proporción de consultas de la semana sin respuesta el mismo día, según speed, afterhours y busy (tope 60 %). */
export function unansweredShare(answers: Answers): number {
  const ps = [
    DELAY_SPEED[single(answers, "speed") ?? ""] ?? DELAY_SPEED_UNANSWERED,
    DELAY_AFTERHOURS[single(answers, "afterhours") ?? ""] ?? 0,
    DELAY_BUSY[single(answers, "busy") ?? ""] ?? 0,
  ];
  return Math.min(UNANSWERED_CAP, 1 - ps.reduce((acc, p) => acc * (1 - p), 1));
}

/** Proporción de las consultas atendidas cuya cotización no recibe seguimiento, según followup. */
export function noFollowupShare(answers: Answers): number {
  return NO_FOLLOWUP[single(answers, "followup") ?? ""] ?? NO_FOLLOWUP_UNANSWERED;
}

export function adSpend(cfg: Phase1Config, answers: Answers): number {
  return selectedOption(cfg, answers, "ads")?.value ?? 0;
}

// ---------- calculadora ----------

/** 52 semanas / 12 meses (≈ 4.33). Con la fracción exacta, la cifra anual es lostWeek × 52 × cierre × valor. */
export const WEEKS_PER_MONTH = 52 / 12;

export interface CalcResult {
  /** Entradas del dueño (o sus valores iniciales), ya dentro de sus límites. */
  weekly: number;
  unanswered: number;
  noFollowup: number;
  closeOf10: number;
  value: number;
  /** Cuáles de las dos cantidades vienen de la sugerencia (el dueño no las movió). */
  suggested: { unanswered: boolean; noFollowup: boolean };
  /** Consultas perdidas por semana: unanswered + noFollowup. */
  lostWeek: number;
  /** Equivalentes que usan la vista del equipo y el aviso de anuncios: consultas al mes, % perdido, % de cierre. */
  inquiries: number;
  leak: number;
  close: number;
  /** Consultas perdidas al mes. */
  missed: number;
  monthly: number;
  cautious: number;
  annual: number;
  adLeak: number;
}

export const CAUTIOUS_SHARE = 0.25;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function calculatorQuestionOf(cfg: Phase1Config): CalculatorQuestion {
  const q = cfg.questions.find((x): x is CalculatorQuestion => x.type === "calculator");
  if (!q) throw new Error("Config has no calculator question");
  return q;
}

/** Valor inicial de un campo numérico fijo: según el tamaño del equipo si el config lo define, si no `default`. */
export function initialValue(f: CalculatorField, answers: Answers): number {
  if (f.default === "suggested") throw new Error(`${f.id} is suggested from the answers`);
  return f.bySize?.[single(answers, "team") ?? ""] ?? f.default;
}

export function calcValues(cfg: Phase1Config, answers: Answers, overrides: CalcOverrides = {}): CalcResult {
  const fields = Object.fromEntries(calculatorQuestionOf(cfg).fields.map((f) => [f.id, f])) as Record<CalcFieldId, CalculatorField>;
  const fixed = (id: "weekly" | "closeOf10" | "value") => {
    const f = fields[id];
    return clamp(overrides[id] ?? initialValue(f, answers), f.min, f.max);
  };
  const weekly = fixed("weekly");
  const closeOf10 = fixed("closeOf10");
  const value = fixed("value");
  // Una consulta cuenta una sola vez: sin seguimiento solo puede salir de las que sí se atendieron.
  const unanswered = clamp(overrides.unanswered ?? Math.round(weekly * unansweredShare(answers)), 0, weekly);
  const answered = weekly - unanswered;
  const noFollowup = clamp(overrides.noFollowup ?? Math.round(answered * noFollowupShare(answers)), 0, answered);

  const lostWeek = unanswered + noFollowup;
  // Enteros hasta la última división, para que la cifra anual sea exacta.
  const annual = (lostWeek * 52 * closeOf10 * value) / 10;
  const monthly = annual / 12;
  return {
    weekly,
    unanswered,
    noFollowup,
    closeOf10,
    value,
    suggested: { unanswered: overrides.unanswered === undefined, noFollowup: overrides.noFollowup === undefined },
    lostWeek,
    inquiries: weekly * WEEKS_PER_MONTH,
    leak: (lostWeek / weekly) * 100,
    close: closeOf10 * 10,
    missed: lostWeek * WEEKS_PER_MONTH,
    monthly,
    cautious: monthly * CAUTIOUS_SHARE,
    annual,
    adLeak: (adSpend(cfg, answers) * lostWeek) / weekly,
  };
}

// ---------- cifras derivadas para la pantalla de resultados ----------
// Solo presentan de otra forma lo que ya da calcValues; no cambian ningún cálculo (docs/SPEC.md §3).

/** Clientes al año ligados a las consultas que se escapan: lostWeek × 52 × closeOf10/10. Sin redondear (ver customersBucket). */
export function lostCustomersPerYear(c: CalcResult): number {
  return (c.lostWeek * 52 * c.closeOf10) / 10;
}

/** Qué frase usar para los clientes al año: menos de uno, uno (redondeado) o varios. */
export function customersBucket(n: number): "few" | "one" | "many" {
  if (n < 1) return "few";
  return Math.round(n) === 1 ? "one" : "many";
}

/** De cada $1,000 en anuncios, cuánto paga consultas que se escapan (= 1,000 × lostWeek / weekly). */
export function adLeakPerThousand(leak: number): number {
  return Math.round(leak * 10);
}

/** Clientes al año y escenario prudente solo tienen sentido si se pierde al menos una consulta (si no, dirían "$0"). */
export function showsLossDetail(c: CalcResult): boolean {
  return c.lostWeek > 0;
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

/**
 * "What you probably don't need yet": máximo 3 (adBudget y moreAds son excluyentes, así que customApp siempre entra).
 * Con demanda baja no se dice "More advertising… fix the system first": contradice el mensaje principal.
 */
export function notYet(ps: PillarScores, avg: number, spend: number, arch: ArchetypeId, sit: Situation = "leak"): NotYetId[] {
  const out: NotYetId[] = [];
  if ((ps.pipeline ?? 100) < 50) out.push("platform");
  if (spend > 0 && arch === "leaky") out.push("adBudget");
  if (spend === 0 && avg < 60 && sit !== "demand") out.push("moreAds");
  out.push("customApp");
  return out.slice(0, 3);
}

// ---------- situación: dónde está la oportunidad según los números ----------
// Capa aparte del arquetipo (que describe el sistema según las respuestas): decide el mensaje principal, el primer
// paso y el regalo. Umbrales en docs/SPEC.md §3; son una hipótesis a calibrar con los primeros 30 diagnósticos.

export type Situation = "leak" | "demand" | "offer" | "scale";

/** Dinero en juego al año por debajo del cual cerrar fugas no es la oportunidad principal. */
export const SMALL_STAKES_ANNUAL = 30_000;
/** demand: muy pocas consultas (≤ 4 por semana ≈ 17 al mes), o pocas (≤ 10) y a lo sumo 1 perdida. */
export const DEMAND_MAX_WEEKLY = 4;
export const DEMAND_LOW_LOSS_MAX_WEEKLY = 10;
export const DEMAND_LOW_LOSS_MAX_LOST = 1;
/** offer: consultas normales y cada cliente nuevo vale poco. */
export const OFFER_MIN_WEEKLY = 5;
export const OFFER_MAX_VALUE = 300;
/** scale confirmado: volumen, poca fuga y respuestas que dicen que el sistema funciona. */
export const SCALE_MIN_WEEKLY = 20;
export const SCALE_MAX_LEAK = 10;
export const SCALE_MIN_INDEX = 70;

/** El índice y el volumen confirman que el sistema atrapa lo que llega (no solo lo que declaró el dueño). */
export function scaleConfirmed(c: CalcResult, avg: number): boolean {
  return avg >= SCALE_MIN_INDEX && c.weekly >= SCALE_MIN_WEEKLY && c.leak <= SCALE_MAX_LEAK;
}

/**
 * Primera regla que se cumple: demand → offer → scale → leak. Con 0 perdidas nunca es leak (si no es demand ni offer,
 * es scale: lo que el dueño declaró, aunque el índice no lo confirme).
 */
export function situation(c: CalcResult, avg: number): Situation {
  const small = c.annual < SMALL_STAKES_ANNUAL;
  const fewInquiries =
    c.weekly <= DEMAND_MAX_WEEKLY || (c.weekly <= DEMAND_LOW_LOSS_MAX_WEEKLY && c.lostWeek <= DEMAND_LOW_LOSS_MAX_LOST);
  if (small && fewInquiries) return "demand";
  if (small && c.weekly >= OFFER_MIN_WEEKLY && c.value < OFFER_MAX_VALUE) return "offer";
  if (c.lostWeek === 0 || scaleConfirmed(c, avg)) return "scale";
  return "leak";
}

/** La cifra va en el panel naranja solo cuando cerrar fugas es el mensaje y hay dinero de verdad en juego. */
export function moneyTone(sit: Situation, c: CalcResult): "leak" | "neutral" {
  return sit === "leak" && c.annual >= SMALL_STAKES_ANNUAL ? "leak" : "neutral";
}

/** Con demanda baja, una nota sobre capacidad: a quien trabaja solo o depende de sí mismo puede faltarle tiempo, no clientes. */
export function capacityNote(sit: Situation, answers: Answers, ps: PillarScores): boolean {
  return sit === "demand" && (single(answers, "team") === "1" || (ps.owner ?? 100) <= 25);
}

type Fix = { pillar: Phase1PillarId; score: number };
export type FirstStep = { kind: "pillar"; pillar: Phase1PillarId; score: number } | { kind: "situation"; situation: Exclude<Situation, "leak"> };

const THEN_WITH_SITUATION_STEP = 2;

/**
 * "Start here" y "Then". leak, y scale sin confirmar: el pilar más débil primero (rankFixes), como siempre.
 * demand: si la reputación está por debajo de 70, su hallazgo (es visibilidad); si no, el paso de demanda.
 * offer y scale confirmado: el paso de la situación. Cuando el primero no sale de los pilares, "Then" lleva hasta 2.
 */
export function stepPlan(sit: Situation, confirmed: boolean, ps: PillarScores, fixes: Fix[]): { first: FirstStep | null; then: Fix[] } {
  const fromPillars = () => (fixes.length ? { first: { kind: "pillar" as const, ...fixes[0] }, then: fixes.slice(1) } : { first: null, then: [] });
  if (sit === "leak" || (sit === "scale" && !confirmed)) return fromPillars();
  if (sit === "demand" && (ps.reputation ?? 100) < 70) {
    const score = ps.reputation as number;
    return { first: { kind: "pillar", pillar: "reputation", score }, then: fixes.filter((f) => f.pillar !== "reputation").slice(0, THEN_WITH_SITUATION_STEP) };
  }
  return { first: { kind: "situation", situation: sit }, then: fixes.slice(0, THEN_WITH_SITUATION_STEP) };
}

// ---------- vista del equipo (solo /admin) ----------

export type Verdict = "high" | "nurture" | "prepare" | "selective" | "low" | "demand" | "offer";
export type TeamFlag = "unmeasured" | "lowVolume" | "demandLimited" | "lowTicket" | "scaleReady" | "declaredNoLoss" | "payingLeak" | "ownerBottleneck" | "solo";

export interface TeamScores {
  need: number;
  potential: number;
  readiness: number;
  verdict: Verdict;
  flags: TeamFlag[];
}

/**
 * `opts.readiness`: Readiness final de la fase 2 (finalReadiness), que reemplaza a la fórmula preliminar y entra en el
 * veredicto con el mismo umbral.
 */
export function teamScores(cfg: Phase1Config, answers: Answers, ps: PillarScores, avg: number, c: CalcResult, opts: { readiness?: number } = {}): TeamScores {
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
  const readiness =
    opts.readiness ??
    Math.min(85, 40 + (spend > 0 ? 20 : 0) + (tracking === "crm" || tracking === "sheet" ? 15 : 0) + (hasTeam ? 10 : 0));

  // demand y offer tienen veredicto propio: con ticket alto, demand podría llegar a "high" por Potential.
  const sit = situation(c, avg);
  let verdict: Verdict;
  if (sit === "demand") verdict = "demand";
  else if (sit === "offer") verdict = "offer";
  else if (need >= 50 && potential >= 60) verdict = readiness >= 55 ? "high" : "nurture";
  else if (need >= 50) verdict = "prepare";
  else if (potential >= 60) verdict = "selective";
  else verdict = "low";
  // scale solo por lo declarado (0 perdidas, sin confirmar): como mucho selective, hasta verificarlo en la llamada.
  const declaredOnly = sit === "scale" && !scaleConfirmed(c, avg);
  if (declaredOnly && (verdict === "high" || verdict === "nurture")) verdict = "selective";

  const flags: TeamFlag[] = [];
  if (single(answers, "speed") === "dk") flags.push("unmeasured");
  // demandLimited reemplaza a lowVolume (no se acumulan alertas sobre lo mismo).
  if (sit === "demand") flags.push("demandLimited");
  else if (c.inquiries < 20) flags.push("lowVolume");
  if (sit === "offer") flags.push("lowTicket");
  if (sit === "scale" && !declaredOnly) flags.push("scaleReady");
  if (declaredOnly) flags.push("declaredNoLoss");
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
  const calc = calcValues(cfg, answers, overrides);
  const sit = situation(calc, avg);
  const confirmed = sit === "scale" && scaleConfirmed(calc, avg);
  const fixes = rankFixes(pillars, arch);
  return {
    pillars,
    avg,
    band: indexBand(avg),
    spend,
    archetype: arch,
    situation: sit,
    /** scale: el índice y el volumen lo confirman; si no, el texto solo repite lo que declaró el dueño. */
    scaleConfirmed: confirmed,
    fixes,
    steps: stepPlan(sit, confirmed, pillars, fixes),
    notYet: notYet(pillars, avg, spend, arch, sit),
    moneyTone: moneyTone(sit, calc),
    capacityNote: capacityNote(sit, answers, pillars),
    calc,
  };
}

// ---------- fase 2 (docs/SPEC.md §4; textos en config/phase2.config.json) ----------

/** Opciones elegidas en una pregunta de la fase 2 (single: una; multi: las marcadas). */
function picked2(q: Phase2Question, answers: Answers): Phase2Option[] {
  const a = answers[q.id];
  const ids = typeof a === "string" ? [a] : Array.isArray(a) ? a : [];
  return q.options.filter((o) => ids.includes(o.id));
}

/** La respuesta (single o multi) incluye alguna de las opciones de la lista. Sin respuesta: false. */
function answerIn(answers: Answers, qid: string, ids: string[]): boolean {
  const a = answers[qid];
  if (typeof a === "string") return ids.includes(a);
  return Array.isArray(a) && a.some((x) => ids.includes(x));
}

const isAnswered = (answers: Answers, qid: string) => {
  const a = answers[qid];
  return typeof a === "string" || (Array.isArray(a) && a.length > 0);
};

const allIn = (m: AnswerMatch | undefined, answers: Answers) => Object.entries(m ?? {}).every(([qid, ids]) => answerIn(answers, qid, ids));
const noneIn = (m: AnswerMatch | undefined, answers: Answers) => Object.entries(m ?? {}).every(([qid, ids]) => !answerIn(answers, qid, ids));

/** Preguntas de la fase 2 que se muestran: `showIf` según la situación de la fase 1 y las respuestas anteriores. */
export function visibleQuestions2(cfg: Phase2Config, answers: Answers, sit: Situation): Phase2Question[] {
  return cfg.questions.filter((q) => {
    const s = q.showIf;
    if (!s) return true;
    if (s.situation && !s.situation.includes(sit)) return false;
    if (s.answered && !isAnswered(answers, s.answered)) return false;
    return noneIn(s.notAnswer, answers);
  });
}

/** Solo las respuestas de preguntas visibles: una respuesta vieja de una pregunta que ya no se muestra no cuenta. */
export function visibleAnswers2(cfg: Phase2Config, answers: Answers, sit: Situation): Answers {
  const out: Answers = {};
  for (const q of visibleQuestions2(cfg, answers, sit)) if (answers[q.id] !== undefined) out[q.id] = answers[q.id];
  return out;
}

/** Flags de las opciones elegidas en la fase 2 (sin repetir, en el orden del config). */
export function phase2Flags(cfg: Phase2Config, answers: Answers, sit: Situation): string[] {
  const a = visibleAnswers2(cfg, answers, sit);
  return [...new Set(cfg.questions.flatMap((q) => picked2(q, a).flatMap((o) => o.flags ?? [])))];
}

/**
 * Los 8 pilares con las dos fases: cada pilar es el promedio de todos sus aportes (fase 1 + fase 2, solo preguntas
 * single). Los pilares que la fase 2 no toca quedan igual que en la fase 1.
 */
export function combinedPillars(cfg1: Phase1Config, a1: Answers, cfg2: Phase2Config, a2: Answers, sit: Situation): PillarScores {
  const acc: Record<string, number[]> = {};
  for (const q of cfg1.questions) {
    if (q.type !== "single") continue;
    for (const [p, v] of Object.entries(selectedOption(cfg1, a1, q.id)?.scores ?? {})) (acc[p] ||= []).push(v as number);
  }
  const vis = visibleAnswers2(cfg2, a2, sit);
  for (const q of cfg2.questions) {
    if (q.type !== "single") continue;
    for (const o of picked2(q, vis)) for (const [p, v] of Object.entries(o.scores ?? {})) (acc[p] ||= []).push(v as number);
  }
  const out: PillarScores = {};
  for (const [p, arr] of Object.entries(acc)) out[p as Phase1PillarId] = Math.round(arr.reduce((x, y) => x + y, 0) / arr.length);
  return out;
}

/** Pilares de la fase 1 cuyo valor cambió con la fase 2: el informe muestra los dos valores. */
export function pillarChanges(p1: PillarScores, full: PillarScores): { id: Phase1PillarId; was: number; now: number }[] {
  return (Object.keys(p1) as Phase1PillarId[])
    .filter((id) => typeof p1[id] === "number" && typeof full[id] === "number" && p1[id] !== full[id])
    .map((id) => ({ id, was: p1[id] as number, now: full[id] as number }));
}

/** Componentes de Readiness (solo vista del equipo). capacity = promedio de sus aportes; los demás, el valor elegido. */
export function teamComponents(cfg: Phase2Config, answers: Answers, sit: Situation): Partial<Record<TeamComponent, number>> {
  const vis = visibleAnswers2(cfg, answers, sit);
  const acc: Partial<Record<TeamComponent, number[]>> = {};
  for (const q of cfg.questions)
    for (const o of picked2(q, vis)) for (const [k, v] of Object.entries(o.team ?? {})) (acc[k as TeamComponent] ||= []).push(v as number);
  const out: Partial<Record<TeamComponent, number>> = {};
  for (const [k, arr] of Object.entries(acc)) out[k as TeamComponent] = arr.reduce((x, y) => x + y, 0) / arr.length;
  return out;
}

/**
 * Pesos de Readiness al terminar la fase 2. **Hipótesis a calibrar** con los primeros 30 diagnósticos completos, igual
 * que SMALL_STAKES_ANNUAL; el umbral del veredicto sigue en 55.
 */
export const READINESS_WEIGHTS: Record<TeamComponent, number> = { capacity: 0.3, decision: 0.25, budget: 0.25, timeline: 0.2 };
/** Con presupuesto menor a $400 al mes (flag lowBudget), Readiness no pasa de este valor ("Nutrir", no "Alta prioridad"). */
export const LOW_BUDGET_READINESS_CAP = 50;

/** Readiness sin el tope de presupuesto; null si falta algún componente (fase 2 sin terminar). */
export function readinessRaw(comp: Partial<Record<TeamComponent, number>>): number | null {
  const keys = Object.keys(READINESS_WEIGHTS) as TeamComponent[];
  if (keys.some((k) => typeof comp[k] !== "number")) return null;
  return Math.round(keys.reduce((sum, k) => sum + READINESS_WEIGHTS[k] * (comp[k] as number), 0));
}

/** Readiness final de la fase 2, con el tope por presupuesto bajo. "Burned by tech" no entra: no resta. */
export function finalReadiness(comp: Partial<Record<TeamComponent, number>>, flags: string[]): number | null {
  const raw = readinessRaw(comp);
  if (raw === null) return null;
  return flags.includes("lowBudget") ? Math.min(raw, LOW_BUDGET_READINESS_CAP) : raw;
}

/** Desde este puntaje, la vista del equipo recomienda servicio gestionado y acompañamiento. */
export const MANAGED_FIT_MIN = 50;

/**
 * Qué tanto conviene el servicio gestionado: burned by tech +40, "yo / nadie" manejaría el sistema +30, trabaja solo
 * +20, "el equipo no la usaba" +10.
 */
export function managedFit(a1: Answers, a2: Answers, flags: string[]): number {
  return (
    (flags.includes("burnedByTech") ? 40 : 0) +
    (answerIn(a2, "t_runner", ["me", "nobody"]) ? 30 : 0) +
    (single(a1, "team") === "1" ? 20 : 0) +
    (flags.includes("toolUnused") ? 10 : 0)
  );
}

export type Phase2TeamFlag =
  | "burnedByTech"
  | "managedService"
  | "lowBudget"
  | "notDecider"
  | "notOwner"
  | "noRunner"
  | "atCapacity"
  | "reviewGating"
  | "burnedByAgency";

const PHASE2_TEAM_FLAGS: Phase2TeamFlag[] = ["burnedByTech", "lowBudget", "notDecider", "notOwner", "noRunner", "atCapacity", "reviewGating", "burnedByAgency"];

export interface FindingContext {
  a1: Answers;
  /** Pilares de la fase 1. */
  ps1: PillarScores;
  calc: CalcResult;
  a2: Answers;
  sit: Situation;
  flags: string[];
}

/** La condición de un mini-hallazgo se cumple (ver FindingWhen en lib/types.ts). */
export function findingMatches(when: FindingWhen, ctx: FindingContext): boolean {
  if (when === "*") return true;
  const { a1, ps1, a2, sit, flags } = ctx;
  if (!allIn(when.answer, a2) || !noneIn(when.notAnswer, a2)) return false;
  if (!allIn(when.p1, a1)) return false;
  if (when.p1Not && !Object.entries(when.p1Not).every(([qid, ids]) => isAnswered(a1, qid) && !answerIn(a1, qid, ids))) return false;
  if (when.p1Lowest) {
    const v = ps1[when.p1Lowest];
    const others = (Object.entries(ps1) as [string, number | undefined][]).filter(([k, x]) => k !== when.p1Lowest && typeof x === "number");
    if (typeof v !== "number" || others.some(([, x]) => (x as number) < v)) return false;
  }
  if (when.p1Below && !Object.entries(when.p1Below).some(([p, n]) => typeof ps1[p as Phase1PillarId] === "number" && (ps1[p as Phase1PillarId] as number) < (n as number)))
    return false;
  if (when.situation && !when.situation.includes(sit)) return false;
  if (when.flag && !flags.includes(when.flag)) return false;
  return true;
}

/** Mini-hallazgo de un bloque: el texto de la primera regla que se cumple, con {closeOf10} de la calculadora. */
export function blockFinding(cfg: Phase2Config, block: Phase2BlockId, ctx: FindingContext): string {
  const vis = { ...ctx, a2: visibleAnswers2(cfg, ctx.a2, ctx.sit) };
  const rule = cfg.findings[block].find((r) => findingMatches(r.when, vis));
  // Mismo formato que fill() de lib/config.ts (no se importa: scoring no depende de los configs).
  return (rule?.text ?? "").replace(/\{closeOf10\}/g, String(ctx.calc.closeOf10));
}

/** Resultado con las dos fases: pilares, cambios frente a la fase 1, índice completo, vista del equipo y mini-hallazgos. */
export function phase2Result(cfg1: Phase1Config, a1: Answers, overrides: CalcOverrides, cfg2: Phase2Config, a2: Answers) {
  const p1 = phase1Result(cfg1, a1, overrides);
  const sit = p1.situation;
  const flags = phase2Flags(cfg2, a2, sit);
  const pillars = combinedPillars(cfg1, a1, cfg2, a2, sit);
  const components = teamComponents(cfg2, a2, sit);
  const readiness = finalReadiness(components, flags);
  // Need y Potential siguen saliendo de la fase 1; Readiness final reemplaza a la preliminar cuando está completo.
  const team = teamScores(cfg1, a1, p1.pillars, p1.avg, p1.calc, readiness === null ? {} : { readiness });
  const fit = managedFit(a1, a2, flags);
  const teamFlags: Phase2TeamFlag[] = PHASE2_TEAM_FLAGS.filter((f) => flags.includes(f));
  if (fit >= MANAGED_FIT_MIN) teamFlags.push("managedService");
  const ctx: FindingContext = { a1, ps1: p1.pillars, calc: p1.calc, a2, sit, flags };
  const findings = Object.fromEntries(cfg2.blocks.map((b) => [b.id, blockFinding(cfg2, b.id, ctx)])) as Record<Phase2BlockId, string>;
  return {
    phase1: p1,
    situation: sit,
    pillars,
    changes: pillarChanges(p1.pillars, pillars),
    /** Índice completo: promedio simple de los 8 pilares. */
    index: averageIndex(pillars),
    flags,
    team: { ...team, readinessFinal: readiness !== null, components, managedFit: fit, phase2Flags: teamFlags },
    findings,
  };
}
