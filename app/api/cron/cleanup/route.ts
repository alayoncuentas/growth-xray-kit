import { bearerOk } from "@/lib/cron";
import { db } from "@/lib/server/db";

// GET /api/cron/cleanup — Vercel Cron, una vez por día (vercel.json). Protegido con CRON_SECRET.
// Llama a cleanup_expired() (supabase/migrations/20261027000000_open_entry.sql): borra empresas abiertas sin correo
// con más de 30 días desde su creación (en cascada) e intentos e inicios de más de 24 horas.
export async function GET(request: Request) {
  if (!bearerOk(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const res = await db().rpc("cleanup_expired");
  if (res.error) {
    console.error("[cron cleanup]", res.error.message);
    return Response.json({ error: "cleanup_failed" }, { status: 500 });
  }
  console.info("[cron cleanup]", JSON.stringify(res.data));
  return Response.json({ ok: true, deleted: res.data }, { headers: { "Cache-Control": "no-store" } });
}
