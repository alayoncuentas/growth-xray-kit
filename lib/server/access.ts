import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "@/lib/config";
import { previewCompany, previewVariant, type PreviewVariant } from "@/lib/preview";
import type { Company, OutsideView } from "@/lib/types";
import { getAdmin } from "./auth";
import { db, must } from "./db";

export interface Access {
  code: string;
  company: Company | null;
  /**
   * Idioma de las pantallas, correos e informe: el que eligió este navegador con el botón EN / ES (cookie);
   * si no eligió, el de la sesión (último idioma en que respondió o que eligió); si no, el del código.
   */
  lang: Lang;
  /** Código de vista previa (solo con sesión de admin): nada se lee ni se escribe en la base. */
  preview?: PreviewVariant;
}

export type AccessError = "format" | "unknown" | "expired" | "rate";
export type AccessResult = { ok: true; access: Access } | { ok: false; reason: AccessError };

const CODE_RE = /^[A-Z0-9-]{6,32}$/;
// Limitación de intentos: máximo 10 códigos fallidos por IP cada 15 minutos.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

export function normalizeCode(raw: string): string {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    // secuencia % inválida: se valida tal cual y falla el formato
  }
  return s.trim().toUpperCase();
}

/** Hash de la IP del cliente: la tabla de intentos nunca guarda la IP. */
async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  return createHash("sha256")
    .update((process.env.IP_HASH_SALT ?? "") + ip)
    .digest("hex");
}

async function isBlocked(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const res = await db().from("access_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("at", since);
  if (res.error) throw new Error(`Supabase (access_attempts): ${res.error.message}`);
  return (res.count ?? 0) >= MAX_FAILURES;
}

async function recordFailure(ipHash: string): Promise<void> {
  const old = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await Promise.all([
    db().from("access_attempts").insert({ ip_hash: ipHash }).then((r) => must(r, "access_attempts insert")),
    // Limpieza de lo que ya no cuenta para esta IP.
    db().from("access_attempts").delete().eq("ip_hash", ipHash).lt("at", old).then((r) => must(r, "access_attempts cleanup")),
  ]);
}

/** Idioma elegido en este navegador con el botón EN / ES, si lo eligió. */
export async function cookieLang(): Promise<Lang | null> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : null;
}

interface CodeRow {
  code: string;
  expires_at: string | null;
  lang: string;
  sessions: { phase: number; lang: string | null }[] | null;
  companies: { name: string; city: string | null; state: string | null; industry: string | null; outside_view: OutsideView | null } | null;
}

function toCompany(c: NonNullable<CodeRow["companies"]>): Company {
  return {
    business: c.name,
    city: [c.city, c.state].filter(Boolean).join(", "),
    industry: c.industry ?? undefined,
    outside: c.outside_view ?? undefined,
  };
}

/**
 * Valida un código del lado del servidor contra access_codes (existe y no venció),
 * con limitación de intentos fallidos por IP guardada en Postgres (sirve con varias instancias).
 */
export async function checkAccess(raw: string): Promise<AccessResult> {
  await connection(); // siempre en tiempo de petición: nunca prerenderizar una validación
  const key = await clientKey();
  const code = normalizeCode(raw);
  const wellFormed = CODE_RE.test(code);

  // Vista previa: solo existe para un admin con sesión. Para cualquier otro es un código inexistente
  // (sigue el camino normal: no está en access_codes y cuenta como intento fallido).
  const pv = wellFormed ? previewVariant(code) : null;
  if (pv && (await getAdmin())) {
    const lang = (await cookieLang()) ?? DEFAULT_LANG;
    return { ok: true, access: { code, company: previewCompany(pv, lang), preview: pv, lang } };
  }

  // En paralelo para ahorrar un viaje a la base; si la IP está bloqueada, el resultado se descarta.
  const [blocked, chosen, row] = await Promise.all([
    isBlocked(key),
    cookieLang(),
    wellFormed
      ? db()
          .from("access_codes")
          .select("code, expires_at, lang, sessions(phase, lang), companies(name, city, state, industry, outside_view)")
          .eq("code", code)
          .maybeSingle<CodeRow>()
          .then((r) => must(r, "access_codes"))
      : null,
  ]);
  if (blocked) return { ok: false, reason: "rate" };

  let reason: AccessError | null = null;
  if (!wellFormed) reason = "format";
  else if (!row) reason = "unknown";
  else if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) reason = "expired";

  if (reason || !row) {
    await recordFailure(key);
    return { ok: false, reason: reason ?? "unknown" };
  }
  const sessionLang = row.sessions?.find((x) => x.phase === 1)?.lang;
  const lang = chosen ?? (isLang(sessionLang) ? sessionLang : isLang(row.lang) ? row.lang : DEFAULT_LANG);
  return { ok: true, access: { code: row.code, company: row.companies ? toCompany(row.companies) : null, lang } };
}
