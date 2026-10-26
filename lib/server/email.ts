import "server-only";
import type { Lang } from "@/lib/config";
import { buildEmail, maskEmail, type EmailKind } from "@/lib/email";
import { db, must } from "./db";

// Envío con Resend (API HTTP, sin SDK). Claves en variables de entorno: RESEND_API_KEY y EMAIL_FROM.
// Sin RESEND_API_KEY en desarrollo, el correo se imprime en la terminal en lugar de enviarse.

const RESUME_LIMIT = 3; // links para retomar por código y por hora

interface Sent {
  id: string;
  dev: boolean;
}

async function send(
  to: string,
  kind: EmailKind,
  vars: { code: string; business: string | null; link: string; lang: Lang; open: boolean },
): Promise<Sent> {
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
    // companies(*): source solo existe con la migración del camino abierto; sin ella, la empresa es invitada.
    await db().from("access_codes").select("email, companies(*)").eq("code", code).maybeSingle(),
    "access_codes contact",
  ) as { email: string | null; companies: ContactCompany | ContactCompany[] | null } | null;
}

type ContactCompany = { name: string | null; source?: string | null };
const one = (c: ContactCompany | ContactCompany[] | null) => (Array.isArray(c) ? (c[0] ?? null) : c);
const businessName = (c: ContactCompany | ContactCompany[] | null) => one(c)?.name ?? null;
const isOpen = (c: ContactCompany | ContactCompany[] | null) => one(c)?.source === "open";

async function logSent(code: string, kind: EmailKind, sent: Sent, lang: Lang) {
  must(await db().from("events").insert({ code, type: "email_sent", payload: { kind, phase: 1, id: sent.id, dev: sent.dev, lang } }), "events insert");
}

/**
 * Informe de la fase 1 al correo del código. Se llama una vez, al registrar phase_done.
 * Sin correo en el código no hay a quién enviarlo: se omite (el informe sigue en /r/[code]).
 * `lang`: el idioma en que respondió.
 */
export async function sendReportEmail(code: string, origin: string, lang: Lang): Promise<void> {
  const contact = await codeContact(code);
  if (!contact?.email) return;
  const sent = await send(contact.email, "report", {
    code,
    business: businessName(contact.companies),
    link: `${origin}/r/${code}`,
    lang,
    open: isOpen(contact.companies),
  });
  await logSent(code, "report", sent, lang);
}

export type ResumeResult = { status: "sent"; to: string } | { status: "needEmail" } | { status: "rate" } | { status: "error" };

/**
 * "Save and finish later": envía el link para retomar al correo del código. Si el código no tiene correo,
 * usa el que escribe el prospecto y lo guarda (solo si estaba vacío: un correo ya registrado no se reemplaza).
 * Máximo 3 por código y por hora, para que no sirva para enviar correos a terceros.
 */
export async function sendResumeEmail(code: string, origin: string, typedEmail: string | null, lang: Lang): Promise<ResumeResult> {
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

  const sent = await send(to, "resume", {
    code,
    business: businessName(contact.companies),
    link: `${origin}/x/${code}`,
    lang,
    open: isOpen(contact.companies),
  });
  await logSent(code, "resume", sent, lang);
  return { status: "sent", to: maskEmail(to) };
}
