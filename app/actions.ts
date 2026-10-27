"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isLang, LANG_COOKIE } from "@/lib/config";
import { getConfig } from "@/lib/config";
import { afterBusiness, stepHref } from "@/lib/flow";
import { normalizeEmail } from "@/lib/email";
import { arrivalFrom, parseBusinessForm } from "@/lib/open-entry";
import { browserLang, checkAccess, clientKey, type AccessError } from "@/lib/server/access";
import { captureEmail as saveCapturedEmail, type CaptureFrom } from "@/lib/server/capture";
import { openLink, setSessionLang } from "@/lib/server/diagnostic";
import { sendResumeEmail } from "@/lib/server/email";
import { createOpenSession, openEntryEnabled, openLimitHit, saveBusinessData, verifyTurnstile } from "@/lib/server/open-entry";
import { appOrigin } from "@/lib/server/origin";

export type CodeFormState = { error?: AccessError; code?: string };

export async function submitCode(_prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const raw = String(formData.get("code") ?? "");
  const r = await checkAccess(raw);
  if (!r.ok) return { error: r.reason, code: raw };
  redirect(`/x/${encodeURIComponent(r.access.code)}`);
}

export type StartState = { error?: "turnstile" | "limit" | "unavailable" | "generic" };

/**
 * "Start my X-Ray" (camino abierto): flag → Turnstile → límite por IP → empresa + código interno + sesión.
 * Con el flag apagado responde error aunque alguien llame la acción directo. Va directo a la pregunta de rubro.
 */
export async function startOpen(_prev: StartState, formData: FormData): Promise<StartState> {
  if (!openEntryEnabled()) return { error: "unavailable" };
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") ?? "")))) return { error: "turnstile" };
  let code: string;
  try {
    const ipHash = await clientKey();
    if (await openLimitHit(ipHash)) return { error: "limit" };
    const h = await headers();
    const arrival = arrivalFrom(
      (k) => {
        const v = formData.get(k);
        return typeof v === "string" ? v : null;
      },
      h.get("referer"),
      h.get("host"),
    );
    code = await createOpenSession(ipHash, { lang: await browserLang(), ...arrival });
  } catch (e) {
    console.error("[open start]", e);
    return { error: "generic" };
  }
  redirect(`/x/${code}/q/industry`);
}

export type BusinessState = {
  errors?: { name?: true; website?: true };
  error?: "save";
  values?: { name: string; website: string };
};

/**
 * Datos del negocio (camino abierto, después del rubro): guarda nombre y web y sigue con la pregunta que viene.
 * La vista previa valida igual pero no guarda nada.
 */
export async function saveBusiness(code: string, _prev: BusinessState, formData: FormData): Promise<BusinessState> {
  const r = await checkAccess(code);
  if (!r.ok) return { error: "save" };
  const parsed = parseBusinessForm({ name: formData.get("name"), website: formData.get("website") });
  if (!parsed.ok) return { errors: parsed.errors, values: { name: parsed.name, website: parsed.website } };
  const values = { name: parsed.name, website: String(formData.get("website") ?? "") };
  if (!r.access.preview) {
    if (!r.access.open) return { error: "save" }; // una empresa invitada no se edita desde aquí
    try {
      if (!(await saveBusinessData(r.access.code, parsed))) return { error: "save", values };
    } catch (e) {
      console.error("[business]", r.access.code, e);
      return { error: "save", values };
    }
  }
  redirect(stepHref(r.access.code, afterBusiness(getConfig(r.access.lang), r.access.company?.industry)));
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

export type CaptureState = { error?: "email" | "save"; email?: string };

/**
 * Pantalla del correo (`from = "screen"`) o bloque para desbloquear el parcial (`"partial"`): guarda el correo con
 * el consentimiento y lleva al resultado completo. Desde el parcial, con el aviso "Unlocked…" (?unlocked=1).
 * La vista previa valida igual pero no guarda nada.
 */
export async function captureEmail(code: string, from: CaptureFrom, _prev: CaptureState, formData: FormData): Promise<CaptureState> {
  const r = await checkAccess(code);
  if (!r.ok) return { error: "save" };
  const raw = String(formData.get("email") ?? "");
  const email = normalizeEmail(raw);
  if (!email) return { error: "email", email: raw };
  if (!r.access.preview) {
    try {
      await saveCapturedEmail(r.access, email, from);
    } catch (e) {
      console.error("[email capture]", r.access.code, e);
      return { error: "save", email: raw };
    }
  }
  const results = stepHref(r.access.code, { kind: "results" });
  redirect(from === "partial" && !r.access.preview ? `${results}?unlocked=1` : results);
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
    return await sendResumeEmail(r.access.code, await appOrigin(), typed, r.access.lang);
  } catch (e) {
    console.error("[email resume]", r.access.code, e);
    return { status: "error" };
  }
}

/**
 * Botón EN / ES: guarda la elección en este navegador (cookie) y, en un link con código, en la sesión,
 * para que los correos y el informe salgan en ese idioma. En la vista previa solo cambia la cookie.
 */
export async function setLang(lang: string, code: string | null): Promise<void> {
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  if (!code) return;
  const r = await checkAccess(code);
  if (r.ok && !r.access.preview) await setSessionLang(r.access.code, lang);
}
