import "server-only";
import { after } from "next/server";
import { consentedEmail, EMAIL_CONSENT_VERSION } from "@/lib/email";
import type { Access } from "./access";
import { db, must } from "./db";
import { phaseDone } from "./diagnostic";
import { sendReportEmail } from "./email";
import { appOrigin } from "./origin";

// Pantalla del correo y bloque para desbloquear el parcial (docs/OPEN_ENTRY.md §1 y §9).

/** Dónde dejó el correo: pantalla del correo, bloque del parcial o "Save and finish later" (lib/server/email.ts). */
export type CaptureFrom = "screen" | "partial" | "later";

/**
 * Guarda el correo con la fecha y la versión del consentimiento ("By continuing…"), solo si el código no tenía
 * correo (uno ya registrado nunca se reemplaza). Registra `email_captured` y, si la fase 1 ya terminó, envía el
 * informe después de responder. Devuelve false si el código ya tenía correo.
 */
export async function captureEmail(access: Access, email: string, from: CaptureFrom): Promise<boolean> {
  const { code } = access;
  const set = must(
    await db()
      .from("access_codes")
      .update(consentedEmail(email, new Date()))
      .eq("code", code)
      .is("email", null)
      .select("code"),
    "access_codes email capture",
  ) as { code: string }[];
  if (!set.length) return false;

  const [done] = await Promise.all([
    phaseDone(code),
    db()
      .from("events")
      .insert({ code, type: "email_captured", payload: { phase: 1, from, open: access.open, consent: EMAIL_CONSENT_VERSION } })
      .then((r) => must(r, "events insert")),
  ]);
  if (done) {
    const origin = await appOrigin();
    after(() => sendReportEmail(code, origin, access.lang).catch((e) => console.error("[email report]", code, e)));
  }
  return true;
}
