import "server-only";
import { headers } from "next/headers";
import { generateCode } from "@/lib/admin";
import type { Lang } from "@/lib/config";
import { isOpenEntryEnabled, openLimitReached, turnstileOk, type Utm } from "@/lib/open-entry";
import { db, must } from "./db";
import { startOpenSession } from "./diagnostic";

// Camino abierto: crear empresa + código interno + sesión desde el inicio, sin código de invitación.
// Orden en la acción: flag → Turnstile → límite por IP → crear. Decisiones en docs/OPEN_ENTRY.md.

const production = process.env.NODE_ENV === "production";

export const openEntryEnabled = () =>
  isOpenEntryEnabled(process.env.OPEN_ENTRY_ENABLED, { production, hasSalt: !!process.env.IP_HASH_SALT });

/** Host esperado en la respuesta de Turnstile: el de NEXT_PUBLIC_APP_URL, solo en producción. */
function expectedHost(): string | null {
  if (!production || !process.env.NEXT_PUBLIC_APP_URL) return null;
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
  } catch {
    return null;
  }
}

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Valida el token del widget de Turnstile con Cloudflare. Sin clave secreta configurada, nunca pasa. */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token || token.length > 2048) return false;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip");
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };
    const ok = turnstileOk(data, expectedHost());
    if (!ok) console.warn("[turnstile]", data["error-codes"] ?? [], data.action, data.hostname);
    return ok;
  } catch (e) {
    console.error("[turnstile]", e);
    return false;
  }
}

async function countSince(ipHash: string, ms: number): Promise<number> {
  const res = await db()
    .from("open_starts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("at", new Date(Date.now() - ms).toISOString());
  if (res.error) throw new Error(`Supabase (open_starts): ${res.error.message}`);
  return res.count ?? 0;
}

/** Límite de sesiones nuevas por IP: 5 por hora y 20 por día. */
export async function openLimitHit(ipHash: string): Promise<boolean> {
  const [hour, day] = await Promise.all([countSince(ipHash, 3_600_000), countSince(ipHash, 86_400_000)]);
  return openLimitReached(hour, day);
}

async function recordStart(ipHash: string) {
  const old = new Date(Date.now() - 86_400_000).toISOString();
  await Promise.all([
    db().from("open_starts").insert({ ip_hash: ipHash }).then((r) => must(r, "open_starts insert")),
    // Lo que ya no cuenta para el límite de esta IP.
    db().from("open_starts").delete().eq("ip_hash", ipHash).lt("at", old).then((r) => must(r, "open_starts cleanup")),
  ]);
}

/** Inserta el código interno; si choca con uno existente (improbable con 50 bits), prueba otro. */
async function insertCode(companyId: string, lang: Lang): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const res = await db().from("access_codes").insert({ code, company_id: companyId, lang });
    if (!res.error) return code;
    if (res.error.code !== "23505") throw new Error(`Supabase (access_codes insert): ${res.error.message}`);
  }
  throw new Error("Could not generate a unique code");
}

/** Crea la empresa (source = open, sin nombre todavía), su código interno y la sesión. Devuelve el código. */
export async function createOpenSession(ipHash: string, input: { lang: Lang; utm: Utm | null; referrer: string | null }): Promise<string> {
  const row = must(
    await db().from("companies").insert({ source: "open", utm: input.utm, referrer: input.referrer }).select("id").single(),
    "companies insert",
  ) as { id: string };
  const code = await insertCode(row.id, input.lang);
  await Promise.all([recordStart(ipHash), startOpenSession(code, (await headers()).get("user-agent"), input.lang)]);
  return code;
}

/**
 * Datos del negocio del camino abierto: nombre y web. Solo escribe en empresas `open` (una invitada la
 * carga el equipo). Devuelve false si el código no tiene una empresa abierta.
 */
export async function saveBusinessData(code: string, data: { name: string; website: string | null }): Promise<boolean> {
  const row = must(await db().from("access_codes").select("company_id").eq("code", code).maybeSingle(), "access_codes company") as {
    company_id: string | null;
  } | null;
  if (!row?.company_id) return false;
  const updated = must(
    await db().from("companies").update({ name: data.name, website: data.website }).eq("id", row.company_id).eq("source", "open").select("id"),
    "companies business",
  ) as { id: string }[];
  return updated.length > 0;
}
