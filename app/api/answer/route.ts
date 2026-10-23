import { getQuestion } from "@/lib/config";
import { checkAccess } from "@/lib/server/access";

// POST /api/answer — guarda una respuesta y recalcula puntajes.
// Hoy solo valida la petición; todavía no hay base de datos.
// TODO(supabase): upsert en answers (session_id + question_id), recalcular con phase1Result y guardar en scores.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const { code, questionId, value } = (body ?? {}) as { code?: unknown; questionId?: unknown; value?: unknown };
  if (typeof code !== "string" || typeof questionId !== "string" || value === undefined) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const access = await checkAccess(code);
  if (!access.ok) return Response.json({ error: access.reason }, { status: access.reason === "rate" ? 429 : 400 });
  if (!getQuestion(questionId)) return Response.json({ error: "unknown_question" }, { status: 400 });

  return Response.json({ error: "not_implemented", detail: "Answer storage is not connected yet." }, { status: 501 });
}
