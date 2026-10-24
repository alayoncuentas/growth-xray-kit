"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkAccess, type AccessError } from "@/lib/server/access";
import { openLink } from "@/lib/server/diagnostic";
import { sendResumeEmail } from "@/lib/server/email";
import { appOrigin } from "@/lib/server/origin";

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

export type SaveLaterState =
  | { status: "idle" }
  | { status: "sent"; to: string }
  | { status: "needEmail"; error?: "email" }
  | { status: "rate" | "error" | "preview" };

/** "Save and finish later": envía por correo el link para retomar. Las respuestas ya están guardadas. */
export async function saveForLater(code: string, _prev: SaveLaterState, formData: FormData): Promise<SaveLaterState> {
  const r = await checkAccess(code);
  if (!r.ok) return { status: "error" };
  if (r.access.preview) return { status: "preview" }; // la vista previa no envía correos
  const typed = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  if (typed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed)) return { status: "needEmail", error: "email" };
  try {
    return await sendResumeEmail(r.access.code, await appOrigin(), typed);
  } catch (e) {
    console.error("[email resume]", r.access.code, e);
    return { status: "error" };
  }
}
