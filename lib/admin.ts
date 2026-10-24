// Funciones puras del panel interno: códigos de acceso, embudo, CSV y validación del formulario de empresas.
// Sin dependencias del servidor para poder testearlas; los datos los trae lib/server/admin-data.ts.

import type { OutsideView } from "./types";

// ---------- códigos de acceso ----------

/**
 * Base32 sin caracteres ambiguos: quita 0, 1, I y O (se confunden al leer o dictar).
 * Son 32 símbolos, así que cada uno aporta 5 bits y un byte aleatorio se mapea sin sesgo (256 = 8 × 32).
 */
export const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LENGTH = 10; // 50 bits; se muestra como XXXXX-XXXXX

export function generateCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(CODE_LENGTH);
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[bytes[i] % 32];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

// ---------- estados y embudo ----------

export const STATUSES = ["sent", "opened", "p1_done", "p2_done", "booked"] as const;
export type CodeStatus = (typeof STATUSES)[number];

export interface FunnelStep {
  status: CodeStatus;
  /** Códigos que llegaron al menos a este estado. */
  count: number;
  /** Porcentaje sobre el total enviado (0–100). */
  pct: number;
}

/** Embudo acumulado: un código en p1_done también cuenta como opened y sent. */
export function funnel(statuses: string[]): FunnelStep[] {
  const rank = statuses.map((s) => STATUSES.indexOf(s as CodeStatus)).filter((i) => i >= 0);
  const total = rank.length;
  return STATUSES.map((status, i) => {
    const count = rank.filter((r) => r >= i).length;
    return { status, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });
}

// ---------- CSV ----------

/**
 * CSV (RFC 4180) para la herramienta de correos. Comillas cuando hace falta y protección contra fórmulas:
 * si una celda empieza con = @ o con + / - seguido de algo que no es un número, se antepone '.
 */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T & string)[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=@\t\r]/.test(s) || /^[+-](?![\d\s(])/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))];
  return lines.join("\r\n") + "\r\n";
}

// ---------- formulario de empresa ----------

export interface CompanyInput {
  name: string;
  city: string | null;
  state: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  google_place_id: string | null;
  email: string | null;
  expiresDays: number | null;
  outside_view: OutsideView | null;
}

export type CompanyErrors = Partial<Record<"name" | "state" | "industry" | "website" | "email" | "expiresDays" | "outside", string>>;

export const OUTSIDE_FIELDS = ["date", "text", "reply", "replyGap", "reviews", "lastReview"] as const;
export const EXPIRY_CHOICES = [30, 60, 90] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida y normaliza el formulario. `get` lee un campo (FormData.get o un objeto en los tests). */
export function parseCompanyForm(
  get: (k: string) => string | null | undefined,
  industries: string[],
): { ok: true; data: CompanyInput } | { ok: false; errors: CompanyErrors } {
  const t = (k: string) => {
    const v = (get(k) ?? "").trim();
    return v ? v : null;
  };
  const errors: CompanyErrors = {};

  const name = t("name");
  if (!name) errors.name = "Business name is required.";
  else if (name.length > 120) errors.name = "Keep it under 120 characters.";

  const state = t("state")?.toUpperCase() ?? null;
  if (state && !/^[A-Z]{2}$/.test(state)) errors.state = "Use the two-letter state code, like TX.";

  const industry = t("industry");
  if (industry && !industries.includes(industry)) errors.industry = "Pick an industry from the list.";

  let website = t("website");
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try {
      const u = new URL(website);
      if (!u.hostname.includes(".")) throw new Error();
      website = u.toString();
    } catch {
      errors.website = "That doesn't look like a website address.";
    }
  }

  const email = t("email")?.toLowerCase() ?? null;
  if (email && !EMAIL_RE.test(email)) errors.email = "That doesn't look like an email address.";

  const exp = t("expiresDays");
  let expiresDays: number | null = null;
  if (exp && exp !== "never") {
    expiresDays = Number(exp);
    if (!(EXPIRY_CHOICES as readonly number[]).includes(expiresDays)) errors.expiresDays = "Pick an expiry from the list.";
  }

  // La vista externa se muestra completa en la bienvenida: o todos los campos, o ninguno.
  const outsideVals = OUTSIDE_FIELDS.map((k) => t(`outside_${k}`));
  const filled = outsideVals.filter(Boolean).length;
  let outside_view: OutsideView | null = null;
  if (filled === OUTSIDE_FIELDS.length) {
    outside_view = Object.fromEntries(OUTSIDE_FIELDS.map((k, i) => [k, outsideVals[i]])) as unknown as OutsideView;
  } else if (filled > 0) {
    errors.outside = "Fill in every outside-view field, or leave them all empty.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name: name!,
      city: t("city"),
      state,
      industry,
      website,
      phone: t("phone"),
      google_place_id: t("google_place_id"),
      email,
      expiresDays,
      outside_view,
    },
  };
}

/** Lista de correos admitidos en /admin (variable ADMIN_EMAILS, separada por comas). */
export function isAllowedEmail(email: string | null | undefined, allowList: string | undefined): boolean {
  if (!email || !allowList) return false;
  const allowed = allowList
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
