import "server-only";
import { splitAnswers, unanswered, type AnswerValue, type SavedState } from "@/lib/answers";
import { phase1, phase2, type Lang } from "@/lib/config";
import { isSampleId, sampleState } from "@/lib/preview";
import type { DiagnosticState } from "@/lib/store";
import type { Access } from "./access";
import { INDUSTRY_QID } from "@/lib/flow";
import { answersFromRows2, blockDone, unanswered2 } from "@/lib/phase2";
import { phase1Result, phase2Result, SCORING_VERSION, teamScores } from "@/lib/scoring";
import type { Answers } from "@/lib/types";
import { after } from "next/server";
import { db, must } from "./db";
import { sendReportEmail } from "./email";
import { appOrigin } from "./origin";

// Sesiones de las fases 1 y 2 en Supabase: abrir, leer para retomar, guardar respuestas y la foto de puntajes.
// Quien llama ya validó el código con checkAccess (y, en la fase 2, la entrada: lib/phase2.ts canEnterPhase2).

const PHASE = 1;
type Phase = 1 | 2;
const STATUS_ORDER = ["sent", "opened", "p1_done", "p2_done", "booked"] as const;
type Status = (typeof STATUS_ORDER)[number];
type EventType = "link_opened" | "question_viewed" | "answered" | "phase_done" | "block_done";

interface SessionRow {
  id: string;
  completed_at: string | null;
}

export interface Phase1State extends SavedState {
  started: boolean;
  completed: boolean;
}

async function findSession(code: string, phase: Phase = PHASE): Promise<SessionRow | null> {
  return must(
    await db().from("sessions").select("id, completed_at").eq("code", code).eq("phase", phase).maybeSingle<SessionRow>(),
    "sessions select",
  );
}

/** Una sesión por código y fase; si dos peticiones llegan juntas, la restricción única deja una sola. */
// Abrir el link no fija el idioma de la sesión (puede abrirlo alguien del equipo): lo fijan responder y el botón EN / ES.
async function getOrCreateSession(
  code: string,
  userAgent: string | null,
  lang: Lang | null = null,
  phase: Phase = PHASE,
): Promise<{ session: SessionRow; created: boolean }> {
  const existing = await findSession(code, phase);
  if (existing) return { session: existing, created: false };
  must(
    await db()
      .from("sessions")
      .upsert({ code, phase, user_agent: userAgent?.slice(0, 500) ?? null, lang }, { onConflict: "code,phase", ignoreDuplicates: true }),
    "sessions insert",
  );
  const session = await findSession(code, phase);
  if (!session) throw new Error("Supabase (sessions): session missing after insert");
  return { session, created: true };
}

/** El estado solo avanza (sent → opened → p1_done → …), nunca retrocede. */
async function advanceStatus(code: string, to: Status) {
  const earlier = STATUS_ORDER.slice(0, STATUS_ORDER.indexOf(to));
  must(await db().from("access_codes").update({ status: to }).eq("code", code).in("status", earlier), "access_codes status");
}

async function logEvent(code: string, type: EventType, payload: Record<string, unknown>) {
  must(await db().from("events").insert({ code, type, payload }), "events insert");
}

/**
 * Camino abierto: el rubro respondido se copia a companies.industry (para el panel y el CSV), solo si la empresa
 * es `open` y todavía no tiene rubro. No cambia el recorrido: para una empresa abierta ese valor no cuenta como
 * rubro conocido (lib/server/access.ts).
 */
async function copyOpenIndustry(code: string, industry: string) {
  const row = must(await db().from("access_codes").select("company_id").eq("code", code).maybeSingle(), "access_codes company") as {
    company_id: string | null;
  } | null;
  if (!row?.company_id) return;
  must(
    await db().from("companies").update({ industry }).eq("id", row.company_id).eq("source", "open").is("industry", null),
    "companies industry",
  );
}

async function loadRows(sessionId: string) {
  return must(
    await db().from("answers").select("question_id, value").eq("session_id", sessionId),
    "answers select",
  ) as { question_id: string; value: unknown }[];
}

export function emptyPhase1(): Phase1State {
  return { answers: {}, calc: {}, calcSaved: false, started: false, completed: false };
}

/**
 * Estado inicial de una pantalla: lo guardado en Supabase o, en vista previa, una muestra (?sample=leaky)
 * o nada. La vista previa nunca toca la base.
 */
export async function initialState(access: Access, sample: unknown): Promise<DiagnosticState> {
  if (access.preview) return isSampleId(sample) ? sampleState(sample) : { answers: {}, calc: {} };
  const saved = await loadPhase1(access.code);
  return { answers: saved.answers, calc: saved.calc };
}

/** Estado guardado para hidratar el cliente y decidir dónde retomar. No crea la sesión. */
export async function loadPhase1(code: string): Promise<Phase1State> {
  const session = await findSession(code);
  if (!session) return { answers: {}, calc: {}, calcSaved: false, started: false, completed: false };
  const saved = splitAnswers(phase1, await loadRows(session.id));
  return { ...saved, started: true, completed: !!session.completed_at };
}

/** La fase 1 de este código terminó (`phase_done`). */
export async function phaseDone(code: string): Promise<boolean> {
  return !!(await findSession(code))?.completed_at;
}

/** El prospecto eligió idioma con el botón EN / ES: queda en su sesión, si ya existe (si no, la crea su primera respuesta). */
export async function setSessionLang(code: string, lang: Lang) {
  must(await db().from("sessions").update({ lang }).eq("code", code).eq("phase", PHASE), "sessions lang");
}

/** El usuario abrió su link (o volvió con su código): crea la sesión si no existe y lo registra. */
export async function openLink(code: string, userAgent: string | null) {
  const { created } = await getOrCreateSession(code, userAgent);
  await Promise.all([advanceStatus(code, "opened"), logEvent(code, "link_opened", { phase: PHASE, resumed: !created })]);
}

/** La pregunta se vio en el navegador. No crea la sesión: eso lo hacen abrir el link, el inicio abierto o responder. */
export async function logQuestionViewed(code: string, questionId: string) {
  await logEvent(code, "question_viewed", { phase: PHASE, question_id: questionId });
}

/** Camino abierto: la persona empieza desde el inicio. La sesión nace con el idioma de su navegador. */
export async function startOpenSession(code: string, userAgent: string | null, lang: Lang) {
  await getOrCreateSession(code, userAgent, lang);
  await Promise.all([advanceStatus(code, "opened"), logEvent(code, "link_opened", { phase: PHASE, resumed: false, open: true })]);
}

/**
 * Foto de los puntajes en `scores` (historial, con scoring_version; docs/SPEC.md §8). Nunca se muestra como valor actual:
 * el panel calcula al leer. Si falla (p. ej. sin la migración de la fase 2), queda en el log y la respuesta sigue guardada.
 */
async function snapshotScores(row: Record<string, unknown>) {
  const res = await db()
    .from("scores")
    .upsert({ ...row, scoring_version: SCORING_VERSION, computed_at: new Date().toISOString() });
  if (res.error) console.error("[scores snapshot]", res.error.message);
}

async function saveScores(sessionId: string, s: SavedState) {
  const res = phase1Result(phase1, s.answers, s.calc);
  const team = teamScores(phase1, s.answers, res.pillars, res.avg, res.calc);
  await snapshotScores({
    session_id: sessionId,
    pillars: res.pillars,
    need: team.need,
    potential: team.potential,
    readiness: team.readiness,
    archetype: res.archetype,
    monthly_at_stake: Math.round(res.calc.monthly),
    flags: team.flags,
    verdict: team.verdict,
  });
  return res;
}

/**
 * Guarda una respuesta ya validada, recalcula `scores` y registra `answered`.
 * Con `complete` (botón "See my results") y sin preguntas pendientes, cierra la fase: `phase_done`.
 */
export async function saveAnswer(input: {
  code: string;
  knownIndustry?: string | null;
  questionId: string;
  value: AnswerValue;
  complete: boolean;
  userAgent: string | null;
  /** Idioma en que respondió: queda en la sesión y define el idioma del correo con el informe. */
  lang: Lang;
}): Promise<{ completed: boolean }> {
  const { code, questionId, value, lang } = input;
  const { session } = await getOrCreateSession(code, input.userAgent, lang);
  const now = new Date().toISOString();

  // Todo en un solo viaje: las demás respuestas se leen en paralelo y la nueva se combina en memoria.
  // El cliente envía una respuesta a la vez (lib/sync.ts), así que no hay escrituras cruzadas de la misma sesión.
  const [rows] = await Promise.all([
    loadRows(session.id),
    db()
      .from("answers")
      .upsert({ session_id: session.id, question_id: questionId, value, answered_at: now })
      .then((r) => must(r, "answers upsert")),
    db().from("sessions").update({ last_question_id: questionId, lang }).eq("id", session.id).then((r) => must(r, "sessions update")),
    logEvent(code, "answered", { phase: PHASE, question_id: questionId, value }),
    questionId === INDUSTRY_QID && typeof value === "string" ? copyOpenIndustry(code, value) : null,
  ]);

  const others = rows.filter((r) => r.question_id !== questionId);
  const saved = splitAnswers(phase1, [...others, { question_id: questionId, value }]);
  const res = await saveScores(session.id, saved);

  const done = !!session.completed_at;
  if (input.complete && !done && unanswered(phase1, saved, input.knownIndustry).length === 0) {
    must(await db().from("sessions").update({ completed_at: now }).eq("id", session.id).is("completed_at", null), "sessions complete");
    await Promise.all([
      advanceStatus(code, "p1_done"),
      logEvent(code, "phase_done", { phase: PHASE, archetype: res.archetype, index: res.avg }),
    ]);
    // El correo con el informe sale después de responder: el prospecto no espera a Resend.
    const origin = await appOrigin();
    after(() => sendReportEmail(code, origin, lang).catch((e) => console.error("[email report]", code, e)));
    return { completed: true };
  }
  return { completed: done };
}

// ---------- fase 2 ----------

export interface Phase2State {
  answers: Answers;
  started: boolean;
  completed: boolean;
}

/** Respuestas guardadas de la fase 2 para hidratar el cliente y decidir dónde retomar. No crea la sesión. */
export async function loadPhase2(code: string): Promise<Phase2State> {
  const session = await findSession(code, 2);
  if (!session) return { answers: {}, started: false, completed: false };
  return { answers: answersFromRows2(await loadRows(session.id)), started: true, completed: !!session.completed_at };
}

/** block_done una sola vez por bloque y código. Si falla (sin la migración), queda en el log. */
async function logBlockDone(code: string, block: string) {
  const seen = await db().from("events").select("id").eq("code", code).eq("type", "block_done").eq("payload->>block", block).limit(1);
  if (seen.error) return console.error("[block_done]", seen.error.message);
  if (seen.data?.length) return;
  const res = await db().from("events").insert({ code, type: "block_done", payload: { phase: 2, block } });
  if (res.error) console.error("[block_done]", res.error.message);
}

/**
 * Guarda una respuesta de la fase 2 ya validada (lib/phase2.ts validateAnswer2), registra `answered`, `block_done` al
 * cerrar un bloque por primera vez, y la foto de puntajes de las dos fases. Con `complete` y sin preguntas pendientes,
 * cierra la fase 2: `phase_done` (phase 2) y estado `p2_done`.
 */
export async function saveAnswer2(input: {
  code: string;
  questionId: string;
  value: string | string[];
  complete: boolean;
  userAgent: string | null;
  lang: Lang;
}): Promise<{ completed: boolean }> {
  const { code, questionId, value, lang } = input;
  const p1 = await findSession(code, 1);
  if (!p1?.completed_at) throw new Error("Phase 2 answer without a completed Phase 1");
  const { session } = await getOrCreateSession(code, input.userAgent, lang, 2);
  const now = new Date().toISOString();

  const [rows1, rows2] = await Promise.all([
    loadRows(p1.id),
    loadRows(session.id),
    db()
      .from("answers")
      .upsert({ session_id: session.id, question_id: questionId, value, answered_at: now })
      .then((r) => must(r, "answers upsert")),
    db().from("sessions").update({ last_question_id: questionId, lang }).eq("id", session.id).then((r) => must(r, "sessions update")),
    logEvent(code, "answered", { phase: 2, question_id: questionId, value }),
  ]);

  const s1 = splitAnswers(phase1, rows1);
  // Las filas se leen en paralelo con el upsert: pueden traer ya el valor nuevo. "before" no incluye esta pregunta (si ya
  // estaba respondida y el bloque cerrado, logBlockDone no lo repite: consulta events).
  const before = answersFromRows2(rows2.filter((r) => r.question_id !== questionId));
  const after: Answers = { ...before, [questionId]: value };
  const res = phase2Result(phase1, s1.answers, s1.calc, phase2, after);
  const sit = res.situation;

  const block = phase2.questions.find((q) => q.id === questionId)?.block;
  if (block && !blockDone(phase2, before, sit, block) && blockDone(phase2, after, sit, block)) await logBlockDone(code, block);

  await snapshotScores({
    session_id: session.id,
    pillars: res.pillars,
    need: res.team.need,
    potential: res.team.potential,
    readiness: res.team.readiness,
    archetype: res.phase1.archetype,
    monthly_at_stake: Math.round(res.phase1.calc.monthly),
    flags: [...res.team.flags, ...res.team.phase2Flags],
    verdict: res.team.verdict,
  });

  const done = !!session.completed_at;
  if (input.complete && !done && unanswered2(phase2, after, sit).length === 0) {
    must(await db().from("sessions").update({ completed_at: now }).eq("id", session.id).is("completed_at", null), "sessions complete");
    await Promise.all([advanceStatus(code, "p2_done"), logEvent(code, "phase_done", { phase: 2, index: res.index })]);
    // El correo con el informe completo llega en la etapa 5 (docs/SPEC.md §4).
    return { completed: true };
  }
  return { completed: done };
}
