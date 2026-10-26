// Camino abierto (inicio sin código), funciones puras. Decisiones en docs/OPEN_ENTRY.md.
// La parte con base de datos y Turnstile está en lib/server/open-entry.ts.

/**
 * OPEN_ENTRY_ENABLED: encendido solo con el valor exacto "true". Sin la variable, o con otro valor, apagado.
 * En producción además exige IP_HASH_SALT: sin sal, el hash de una IPv4 se revierte probando todas.
 */
export function isOpenEntryEnabled(value: string | undefined, env: { production: boolean; hasSalt: boolean }): boolean {
  return value === "true" && (!env.production || env.hasSalt);
}

/** Acción que el widget declara y el servidor exige (un token de otro formulario no sirve aquí). */
export const TURNSTILE_ACTION = "start";

/**
 * Respuesta de siteverify aceptable: success y, si se conoce el host esperado (producción), ese hostname y la acción
 * del inicio. Las claves de prueba de Cloudflare devuelven otro host ("example.com"), por eso en local no se exigen.
 */
export function turnstileOk(
  data: { success?: boolean; action?: string; hostname?: string },
  expectedHost: string | null,
): boolean {
  if (data.success !== true) return false;
  if (!expectedHost) return true;
  return data.action === TURNSTILE_ACTION && data.hostname?.toLowerCase() === expectedHost.toLowerCase();
}

/** Límite de sesiones nuevas por IP (hash): 5 por hora y 20 por día. */
export const OPEN_LIMITS = { perHour: 5, perDay: 20 } as const;

export function openLimitReached(lastHour: number, lastDay: number): boolean {
  return lastHour >= OPEN_LIMITS.perHour || lastDay >= OPEN_LIMITS.perDay;
}

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const MAX_UTM = 200;
const MAX_REFERRER = 500;

/** UTM de la URL de llegada (o del formulario). Solo las 5 claves conocidas, recortadas; null si no hay ninguna. */
export function parseUtm(get: (key: string) => string | null | undefined): Utm | null {
  const out: Utm = {};
  for (const k of UTM_KEYS) {
    const v = get(k)?.trim();
    if (v) out[k] = v.slice(0, MAX_UTM);
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Referrer externo (primer contacto): una URL http(s) de otro sitio. Los del propio sitio no cuentan
 * (no son de dónde llegó la persona). null si no hay o no sirve.
 */
export function cleanReferrer(raw: string | null | undefined, ownHost: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (ownHost && url.host.toLowerCase() === ownHost.toLowerCase()) return null;
  return url.toString().slice(0, MAX_REFERRER);
}

// ---------- datos del negocio (después de la pregunta de rubro) ----------

export const MAX_BUSINESS_NAME = 120;
const MAX_WEBSITE = 200;

/**
 * Web opcional, normalizada a "https://dominio[/ruta]". Acepta "ejemplo.com", "www.ejemplo.com/x" o una URL
 * http(s) completa. null si viene vacía; "invalid" si no parece un sitio (sin punto, otro esquema, usuario y clave…).
 */
export function normalizeWebsite(raw: string): string | null | "invalid" {
  const s = raw.trim();
  if (!s) return null;
  if (s.length > MAX_WEBSITE || /\s/.test(s)) return "invalid";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return "invalid";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "invalid";
  if (url.username || url.password || url.port) return "invalid";
  const host = url.hostname.toLowerCase();
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host) || host.split(".").some((p) => !p || p.startsWith("-") || p.endsWith("-"))) {
    return "invalid";
  }
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `https://${host}${path}`;
}

export type BusinessForm =
  | { ok: true; name: string; website: string | null }
  | { ok: false; errors: { name?: true; website?: true }; name: string; website: string };

/** Nombre obligatorio (espacios colapsados, hasta 120 caracteres) y web opcional. */
export function parseBusinessForm(input: { name: unknown; website: unknown }): BusinessForm {
  const rawName = typeof input.name === "string" ? input.name : "";
  const rawWebsite = typeof input.website === "string" ? input.website : "";
  const name = rawName.replace(/\s+/g, " ").trim().slice(0, MAX_BUSINESS_NAME);
  const website = normalizeWebsite(rawWebsite);
  const errors: { name?: true; website?: true } = {};
  if (!name) errors.name = true;
  if (website === "invalid") errors.website = true;
  if (errors.name || errors.website) return { ok: false, errors, name: rawName, website: rawWebsite };
  return { ok: true, name, website: website as string | null };
}
