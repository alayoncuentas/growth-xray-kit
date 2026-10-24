// Correos transaccionales (informe de la fase 1 y link para retomar). Funciones puras: arman asunto, texto y HTML
// desde copy.email del config. El envío está en lib/server/email.ts.

import { copy, fill } from "./config";

export type EmailKind = "report" | "resume";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Correo corto y sin lenguaje de venta: saludo, una línea, un botón, una nota y el pie. */
export function buildEmail(kind: EmailKind, v: { code: string; business: string | null; link: string }): EmailContent {
  const e = copy.email;
  const t = e[kind];
  const forBusiness = v.business ? ` for ${v.business}` : "";
  const greeting = fill(t.greeting, { forBusiness });
  const footer = fill(e.footer, { code: v.code });

  const text = [greeting, "", t.body, "", `${t.cta}: ${v.link}`, "", t.after, "", `— ${e.signoff}`, "", footer].join("\n");

  const p = (s: string, style = "") => `<p style="margin:0 0 16px;${style}">${esc(s)}</p>`;
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:24px 16px;background:#f1f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0e1718;font-size:16px;line-height:1.55">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #d9e2e0;border-radius:12px">
<tr><td style="padding:28px 24px">
${p(greeting, "font-weight:600")}
${p(t.body)}
<p style="margin:0 0 20px"><a href="${esc(v.link)}" style="display:inline-block;background:#1f6f66;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${esc(t.cta)}</a></p>
${p(t.after, "color:#51605f;font-size:14px")}
${p(`— ${e.signoff}`, "margin:0")}
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;color:#6b7978;font-size:12px">${esc(footer)}</p>
</td></tr></table>
</body></html>`;

  return { subject: t.subject, text, html };
}

/** "jane.doe@rivera.com" → "j•••@rivera.com": confirma el destino sin mostrar la dirección completa. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  return `${user.slice(0, 1)}•••@${domain}`;
}
