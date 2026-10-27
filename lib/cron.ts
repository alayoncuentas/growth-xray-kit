// Tareas programadas (Vercel Cron). Vercel llama con "Authorization: Bearer <CRON_SECRET>".

import { createHash, timingSafeEqual } from "node:crypto";

/** Largo mínimo de CRON_SECRET: con uno corto o vacío, ninguna llamada pasa. */
export const MIN_CRON_SECRET = 16;

/**
 * La cabecera Authorization trae exactamente "Bearer <secreto>". Compara en tiempo constante (los hashes tienen
 * el mismo largo, así que timingSafeEqual no revela el largo del secreto). Sin secreto configurado, siempre false.
 */
export function bearerOk(header: string | null | undefined, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_CRON_SECRET || !header?.startsWith("Bearer ")) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}
