import "server-only";
import { splitAnswers, unanswered, type AnswerValue, type SavedState } from "@/lib/answers";
import { phase1, type Lang } from "@/lib/config";
import { isSampleId, sampleState } from "@/lib/preview";
import type { DiagnosticState } from "@/lib/store";
import type { Access } from "./access";
import { phase1Result, teamScores } from "@/lib/scoring";
import { after } from "next/server";
import { db, must } from "./db";
import { sendReportEmail } from "./email";
import { appOrigin } from "./origin";

// Sesión de la fase 1 en Supabase: abrir, leer para retomar, guardar respuestas y recalcular puntajes.
// Quien llama ya validó el código con checkAccess.

const PHASE = 1;
const STATUS_ORDER = ["sent", "opened", "p1_done", "p2_done", "booked"] as const;
type Status = (typeof STATUS_ORDER)[number];
type EventType = "link_opened" | "question_viewed" | "answered" | "phase_done";

interface SessionRow {
  id: string;
  completed_at: string | null;
}

export interface Phase1State extends SavedState {
  started: boolean;
  completed: boolean;
}

async function findSession(code: string): Promise<SessionRow | null> {
  return must(
    await db().from("sessions").select("id, completed_at").eq("code", code).eq("phase", PHASE).maybeSingle<SessionRow>(),
    "sessions select",
  );
}

/** Una sesión por código y fase; si dos peticiones llegan juntas, la restricción única deja una sola. */
// Abrir el link no fija el idioma de la sesión (puede abrirlo alguien del equipo): lo fijan responder y el botón EN / ES.
async function getOrCreateSession(code: string, userAgent: string | null, lang: Lang | null = null): Promise<{ session: SessionRow; created: boolean }> {
  const existing = await findSession(code);
  if (existing) return { session: existing, created: false };
  must(
    await db()
      .from("sessions")
      .upsert({ code, phase: PHASE, user_agent: userAgent?.slice(0, 500) ?? null, lang }, { onConflict: "code,phase", ignoreDuplicates: true }),
    "sessions insert",
  );
  const session = await findSession(code);
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

async function saveScores(sessionId: string, s: SavedState) {
  const res = phase1Result(phase1, s.answers, s.calc);
  const team = teamScores(phase1, s.answers, res.pillars, res.avg, res.calc);
  must(
    await db()
      .from("scores")
      .upsert({
        session_id: sessionId,
        pillars: res.pillars,
        need: team.need,
        potential: team.potential,
        readiness: team.readiness,
        archetype: res.archetype,
        monthly_at_stake: Math.round(res.calc.monthly),
        flags: team.flags,
        verdict: team.verdict,
        computed_at: new Date().toISOString(),
      }),
    "scores upsert",
  );
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
