import "server-only";
import { buildEmail, maskEmail, type EmailKind } from "@/lib/email";
import { db, must } from "./db";

// Envío con Resend (API HTTP, sin SDK). Claves en variables de entorno: RESEND_API_KEY y EMAIL_FROM.
// Sin RESEND_API_KEY en desarrollo, el correo se imprime en la terminal en lugar de enviarse.

const RESUME_LIMIT = 3; // links para retomar por código y por hora

interface Sent {
  id: string;
  dev: boolean;
}

async function send(to: string, kind: EmailKind, vars: { code: string; business: string | null; link: string }): Promise<Sent> {
  const { subject, text, html } = buildEmail(kind, vars);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.info(`\n[email:dev] ${kind} → ${to}\nSubject: ${subject}\n\n${text}\n`);
    return { id: "dev", dev: true };
  }
  if (!from) throw new Error("EMAIL_FROM is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok || !body.id) throw new Error(`Resend ${res.status}: ${body.message ?? "unknown error"}`);
  return { id: body.id, dev: false };
}

async function codeContact(code: string) {
  return must(
    await db().from("access_codes").select("email, companies(name)").eq("code", code).maybeSingle(),
    "access_codes contact",
  ) as { email: string | null; companies: { name: string } | { name: string }[] | null } | null;
}

const businessName = (c: { name: string } | { name: string }[] | null) => (Array.isArray(c) ? c[0]?.name : c?.name) ?? null;

async function logSent(code: string, kind: EmailKind, sent: Sent) {
  must(await db().from("events").insert({ code, type: "email_sent", payload: { kind, phase: 1, id: sent.id, dev: sent.dev } }), "events insert");
}

/**
 * Informe de la fase 1 al correo del código. Se llama una vez, al registrar phase_done.
 * Sin correo en el código no hay a quién enviarlo: se omite (el informe sigue en /r/[code]).
 */
export async function sendReportEmail(code: string, origin: string): Promise<void> {
  const contact = await codeContact(code);
  if (!contact?.email) return;
  const sent = await send(contact.email, "report", { code, business: businessName(contact.companies), link: `${origin}/r/${code}` });
  await logSent(code, "report", sent);
}

export type ResumeResult = { status: "sent"; to: string } | { status: "needEmail" } | { status: "rate" } | { status: "error" };

/**
 * "Save and finish later": envía el link para retomar al correo del código. Si el código no tiene correo,
 * usa el que escribe el prospecto y lo guarda (solo si estaba vacío: un correo ya registrado no se reemplaza).
 * Máximo 3 por código y por hora, para que no sirva para enviar correos a terceros.
 */
export async function sendResumeEmail(code: string, origin: string, typedEmail: string | null): Promise<ResumeResult> {
  const contact = await codeContact(code);
  if (!contact) return { status: "error" };
  let to = contact.email;
  if (!to) {
    if (!typedEmail) return { status: "needEmail" };
    must(await db().from("access_codes").update({ email: typedEmail }).eq("code", code).is("email", null), "access_codes email");
    to = typedEmail;
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await db()
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("code", code)
    .eq("type", "email_sent")
    .eq("payload->>kind", "resume")
    .gte("at", since);
  if (recent.error) throw new Error(`Supabase (events count): ${recent.error.message}`);
  if ((recent.count ?? 0) >= RESUME_LIMIT) return { status: "rate" };

  const sent = await send(to, "resume", { code, business: businessName(contact.companies), link: `${origin}/x/${code}` });
  await logSent(code, "resume", sent);
  return { status: "sent", to: maskEmail(to) };
}
