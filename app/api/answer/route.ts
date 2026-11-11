import { validateAnswer } from "@/lib/answers";
import { phase1, phase2 } from "@/lib/config";
import { canEnterPhase2, getQuestion2, validateAnswer2 } from "@/lib/phase2";
import { phase1Result } from "@/lib/scoring";
import { checkAccess, type Access } from "@/lib/server/access";
import { loadPhase1, loadPhase2, saveAnswer, saveAnswer2 } from "@/lib/server/diagnostic";

// POST /api/answer — guarda una respuesta (y la foto de puntajes, que es historial).
// Body: { code, questionId, value, complete?, phase? (1 por defecto, o 2) }. Nunca devuelve puntajes: la vista del
// equipo es solo de /admin.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const { code, questionId, value, complete, phase } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof code !== "string" ||
    typeof questionId !== "string" ||
    value === undefined ||
    (complete !== undefined && typeof complete !== "boolean") ||
    (phase !== undefined && phase !== 1 && phase !== 2)
  ) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const access = await checkAccess(code);
  if (!access.ok) {
    return access.reason === "rate"
      ? Response.json({ error: "rate_limited" }, { status: 429 })
      : Response.json({ error: "invalid_code" }, { status: 404 });
  }

  if (phase === 2) return answerPhase2(access.access, questionId, value, complete === true, request.headers.get("user-agent"));

  const industry = access.access.company?.industry;
  const clean = validateAnswer(phase1, questionId, value, industry);
  if (clean === null) return Response.json({ error: "invalid_answer" }, { status: 400 });
  // Vista previa: se valida igual, pero no se guarda nada (ni answers, ni events, ni scores).
  if (access.access.preview) return Response.json({ ok: true, completed: false, preview: true });

  try {
    const { completed } = await saveAnswer({
      code: access.access.code,
      knownIndustry: industry,
      questionId,
      value: clean,
      complete: complete === true,
      userAgent: request.headers.get("user-agent"),
      lang: access.access.lang,
    });
    return Response.json({ ok: true, completed });
  } catch (e) {
    console.error("[api/answer]", e);
    return Response.json({ error: "save_failed" }, { status: 500 });
  }
}

/**
 * Fase 2: solo con correo y la fase 1 terminada (docs/SPEC.md §4). La pregunta tiene que estar visible según la
 * situación de la fase 1 y las respuestas ya guardadas.
 */
async function answerPhase2(access: Access, questionId: string, value: unknown, complete: boolean, userAgent: string | null) {
  // Vista previa: sin base; se valida contra el config sin mirar la visibilidad (no hay respuestas guardadas).
  if (access.preview) {
    const q = getQuestion2(phase2, questionId);
    const ok = q && validateAnswer2({ ...phase2, questions: [{ ...q, showIf: undefined }] }, questionId, value, {}, "leak") !== null;
    return ok ? Response.json({ ok: true, completed: false, preview: true }) : Response.json({ error: "invalid_answer" }, { status: 400 });
  }
  try {
    const p1 = await loadPhase1(access.code);
    const gate = canEnterPhase2({ email: access.email, phase1Done: p1.completed });
    if (gate !== "ok") return Response.json({ error: "phase2_locked", gate }, { status: 403 });
    const sit = phase1Result(phase1, p1.answers, p1.calc).situation;
    const saved = await loadPhase2(access.code);
    const clean = validateAnswer2(phase2, questionId, value, saved.answers, sit);
    if (clean === null) return Response.json({ error: "invalid_answer" }, { status: 400 });
    const { completed } = await saveAnswer2({ code: access.code, questionId, value: clean, complete, userAgent, lang: access.lang });
    return Response.json({ ok: true, completed });
  } catch (e) {
    console.error("[api/answer phase 2]", e);
    return Response.json({ error: "save_failed" }, { status: 500 });
  }
}
