// Regalo según calificación (docs/OPEN_ENTRY.md §2). Funciones puras.
// Se decide con la vista del equipo, pero el prospecto nunca ve Need, Potential ni Readiness: solo qué regalo le tocó.

// Con extensión .ts: lo carga lib/admin.ts desde scripts/admin-link.mts, con Node directo (lib/scripts.test.ts).
import { phase1Result, teamScores } from "./scoring.ts";
import type { Answers, CalcOverrides, Phase1Config } from "./types";

export type GiftKind = "A" | "B";

export const isGiftKind = (v: unknown): v is GiftKind => v === "A" || v === "B";

/** A (response-time test + website review): Potential ≥ 60 y Need ≥ 50. B (Google reviews audit): el resto. */
export function giftFor(t: { need: number; potential: number }): GiftKind {
  return t.potential >= 60 && t.need >= 50 ? "A" : "B";
}

/** El regalo que tocaría con estas respuestas (antes de ofrecerlo; una vez ofrecido queda fijo). */
export function giftForAnswers(cfg: Phase1Config, answers: Answers, calc: CalcOverrides): GiftKind {
  const res = phase1Result(cfg, answers, calc);
  return giftFor(teamScores(cfg, answers, res.pillars, res.avg, res.calc));
}

// ---------- plazos en días hábiles (decisión 3) ----------
// Lunes a viernes en America/New_York, sin feriados por ahora. Los plazos (3 y 2) están en copy.gifts del config.

const TZ = "America/New_York";
const DAY = 86_400_000;

const nyParts = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** Hora de Nueva York de un instante, como si fuera UTC (para sacar el día civil y la diferencia horaria). */
function nyWall(t: number): number {
  const p = Object.fromEntries(nyParts.formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Día civil en Nueva York, como la medianoche UTC de ese día (sirve para contar días y saber el día de la semana). */
function nyDay(t: number): number {
  return Math.floor(nyWall(t) / DAY) * DAY;
}

/** Instante en que empieza en Nueva York el día civil `day` (medianoche local, con horario de verano o sin él). */
function nyMidnight(day: number): number {
  let t = day - (nyWall(day) - day);
  t = day - (nyWall(t) - t); // segunda pasada por si el cambio de horario cae entre medio
  return t;
}

const isWeekday = (day: number) => {
  const w = new Date(day).getUTCDay();
  return w !== 0 && w !== 6;
};

/**
 * Vencimiento de un regalo ofrecido en `from`: el final del día hábil número `days` contado desde el día siguiente
 * (en Nueva York). Ofrecido un martes con 3 días → vence al terminar el viernes. Devuelve el instante exclusivo
 * (la medianoche siguiente).
 */
export function addBusinessDays(from: Date, days: number): Date {
  let day = nyDay(from.getTime());
  for (let n = 0; n < days; ) {
    day += DAY;
    if (isWeekday(day)) n++;
  }
  return new Date(nyMidnight(day + DAY));
}

/** Días hábiles que quedan hasta el vencimiento, contando hoy si es hábil. 0 si ya venció. */
export function businessDaysLeft(due: Date, now: Date): number {
  if (now.getTime() >= due.getTime()) return 0;
  const last = nyDay(due.getTime() - 1);
  let n = 0;
  for (let day = nyDay(now.getTime()); day <= last; day += DAY) if (isWeekday(day)) n++;
  return n;
}

export const isOverdue = (due: Date, now: Date) => now.getTime() >= due.getTime();
