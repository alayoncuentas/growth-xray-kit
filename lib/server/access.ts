import "server-only";
import { headers } from "next/headers";
import { connection } from "next/server";
import demo from "@/config/demo-codes.json";
import type { Company } from "@/lib/types";
import { isBlocked, recordFailure } from "./rate-limit";

export interface Access {
  code: string;
  company: Company | null;
}

export type AccessResult = { ok: true; access: Access } | { ok: false; reason: "format" | "rate" };

const CODE_RE = /^[A-Z0-9-]{6,32}$/;

export function normalizeCode(raw: string): string {
  return decodeURIComponent(raw).trim().toUpperCase();
}

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

/**
 * Valida un código del lado del servidor, con limitación de intentos fallidos por IP.
 * Hoy: códigos de demo de config/demo-codes.json; cualquier otro código bien formado abre un
 * diagnóstico genérico (comportamiento del prototipo).
 * TODO(supabase): buscar en access_codes, revisar expires_at y rechazar códigos inexistentes.
 */
export async function checkAccess(raw: string): Promise<AccessResult> {
  await connection(); // siempre en tiempo de petición: nunca prerenderizar una validación
  const key = await clientKey();
  if (isBlocked(key)) return { ok: false, reason: "rate" };
  const code = normalizeCode(raw);
  if (!CODE_RE.test(code)) {
    recordFailure(key);
    return { ok: false, reason: "format" };
  }
  const company = (demo.codes as Record<string, Company>)[code] ?? null;
  return { ok: true, access: { code, company } };
}
