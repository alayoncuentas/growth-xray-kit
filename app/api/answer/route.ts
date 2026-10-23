import { validateAnswer } from "@/lib/answers";
import { phase1 } from "@/lib/config";
import { checkAccess } from "@/lib/server/access";
import { saveAnswer } from "@/lib/server/diagnostic";

// POST /api/answer — guarda una respuesta y recalcula puntajes.
// Body: { code, questionId, value, complete? }. Nunca devuelve puntajes: la vista del equipo es solo de /admin.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const { code, questionId, value, complete } = (body ?? {}) as Record<string, unknown>;
  if (typeof code !== "string" || typeof questionId !== "string" || value === undefined || (complete !== undefined && typeof complete !== "boolean")) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const access = await checkAccess(code);
  if (!access.ok) {
    return access.reason === "rate"
      ? Response.json({ error: "rate_limited" }, { status: 429 })
      : Response.json({ error: "invalid_code" }, { status: 404 });
  }

  const industry = access.access.company?.industry;
  const clean = validateAnswer(phase1, questionId, value, industry);
  if (clean === null) return Response.json({ error: "invalid_answer" }, { status: 400 });

  try {
    const { completed } = await saveAnswer({
      code: access.access.code,
      knownIndustry: industry,
      questionId,
      value: clean,
      complete: complete === true,
      userAgent: request.headers.get("user-agent"),
    });
    return Response.json({ ok: true, completed });
  } catch (e) {
    console.error("[api/answer]", e);
    return Response.json({ error: "save_failed" }, { status: 500 });
  }
}
