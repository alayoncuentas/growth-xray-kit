"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkAccess, type AccessError } from "@/lib/server/access";
import { openLink } from "@/lib/server/diagnostic";

export type CodeFormState = { error?: AccessError; code?: string };

export async function submitCode(_prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const raw = String(formData.get("code") ?? "");
  const r = await checkAccess(raw);
  if (!r.ok) return { error: r.reason, code: raw };
  redirect(`/x/${encodeURIComponent(r.access.code)}`);
}

/**
 * La bienvenida se vio en el navegador: crea la sesión de la fase 1 si falta y registra `link_opened`.
 * Se llama desde el cliente (no al renderizar) para no contar prefetches como aperturas.
 */
export async function markLinkOpened(code: string): Promise<void> {
  const r = await checkAccess(code);
  if (!r.ok || r.access.preview) return; // la vista previa no crea sesión ni registra eventos
  await openLink(r.access.code, (await headers()).get("user-agent"));
}
