import "server-only";
import { generateCode, sourceOf, type CodeStatus, type CompanyInput, type GiftRow, type Source } from "@/lib/admin";
import { isLang, type Lang } from "@/lib/config";
import type { OutsideView } from "@/lib/types";
import { requireAdmin } from "./auth";
import { db, must } from "./db";

// Lecturas y escrituras del panel interno. Cada función exportada exige sesión de admin (capa de acceso a datos):
// así ninguna página o acción puede olvidarse de verificarla.

export interface ScoreRow {
  need: number | null;
  potential: number | null;
  readiness: number | null;
  archetype: string | null;
  monthly_at_stake: number | null;
  flags: string[];
  verdict: string | null;
}

export interface CompanyRow {
  id: string;
  /** null en el camino abierto hasta la pantalla de datos del negocio. */
  name: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  google_place_id: string | null;
  outside_view: OutsideView | null;
  created_at: string;
  /** Camino abierto (con la migración): origen, UTM y referrer del primer contacto. */
  source?: string | null;
  utm?: Record<string, string> | null;
  referrer?: string | null;
}

export interface LeadRow {
  code: string;
  status: CodeStatus;
  email: string | null;
  expires_at: string | null;
  /** Idioma del link (lo elige el equipo). */
  lang: Lang;
  /** Vencido al momento de leer. */
  expired: boolean;
  created_at: string;
  company: CompanyRow | null;
  /** invited (la creó el equipo) u open ("Start my X-Ray"). */
  source: Source;
  /** Consentimiento "By continuing…" al dejar el correo; null si el correo lo cargó el equipo. */
  consent: { at: string; version: string | null } | null;
  /** Regalo ofrecido, si lo hay. */
  gift: GiftRow | null;
  phase1: {
    started_at: string;
    completed_at: string | null;
    last_question_id: string | null;
    /** Idioma en que respondió (o que eligió con el botón EN / ES); null si todavía no. */
    lang: Lang | null;
    scores: ScoreRow | null;
  } | null;
}

// PostgREST devuelve objeto o lista según cómo infiera la relación; se normaliza a uno.
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

const LEAD_SELECT =
  "code, status, email, expires_at, lang, created_at, email_consent_at, email_consent_version, gifts(kind, offered_at, due_at, delivered_at, delivered_by), companies(*), sessions(id, phase, started_at, completed_at, last_question_id, lang, scores(need, potential, readiness, archetype, monthly_at_stake, flags, verdict))";

interface RawLead {
  code: string;
  status: CodeStatus;
  email: string | null;
  expires_at: string | null;
  lang: string;
  created_at: string;
  email_consent_at: string | null;
  email_consent_version: string | null;
  gifts: GiftRow | GiftRow[] | null;
  companies: CompanyRow | CompanyRow[] | null;
  sessions: {
    id: string;
    phase: number;
    started_at: string;
    completed_at: string | null;
    last_question_id: string | null;
    lang: string | null;
    scores: ScoreRow | ScoreRow[] | null;
  }[];
}

function toLead(r: RawLead): LeadRow {
  const s = r.sessions?.find((x) => x.phase === 1);
  const company = one(r.companies);
  return {
    code: r.code,
    status: r.status,
    email: r.email,
    expires_at: r.expires_at,
    lang: isLang(r.lang) ? r.lang : "en",
    expired: !!r.expires_at && new Date(r.expires_at).getTime() < Date.now(),
    created_at: r.created_at,
    company,
    source: sourceOf(company?.source),
    consent: r.email_consent_at ? { at: r.email_consent_at, version: r.email_consent_version } : null,
    gift: one(r.gifts),
    phase1: s
      ? {
          started_at: s.started_at,
          completed_at: s.completed_at,
          last_question_id: s.last_question_id,
          lang: isLang(s.lang) ? s.lang : null,
          scores: one(s.scores),
        }
      : null,
  };
}

export async function listLeads(): Promise<LeadRow[]> {
  await requireAdmin();
  const rows = must(await db().from("access_codes").select(LEAD_SELECT).order("created_at", { ascending: false }), "leads") as RawLead[];
  return rows.map(toLead);
}

export interface LeadDetail extends LeadRow {
  answers: { question_id: string; value: unknown }[];
  events: { type: string; payload: Record<string, unknown>; at: string }[];
  otherCodes: { code: string; status: CodeStatus }[];
}

export async function getLead(code: string): Promise<LeadDetail | null> {
  await requireAdmin();
  const raw = must(await db().from("access_codes").select(LEAD_SELECT).eq("code", code).maybeSingle(), "lead") as
    | RawLead
    | null;
  if (!raw) return null;
  const lead = toLead(raw);
  const sessionId = raw.sessions?.find((s) => s.phase === 1)?.id;

  const [answers, events, otherCodes] = await Promise.all([
    sessionId
      ? db().from("answers").select("question_id, value").eq("session_id", sessionId).then((r) => must(r, "answers"))
      : Promise.resolve([]),
    db().from("events").select("type, payload, at").eq("code", code).order("at", { ascending: false }).limit(100).then((r) => must(r, "events")),
    lead.company
      ? db().from("access_codes").select("code, status").eq("company_id", lead.company.id).neq("code", code).then((r) => must(r, "codes"))
      : Promise.resolve([]),
  ]);
  return { ...lead, answers: answers ?? [], events: events ?? [], otherCodes: (otherCodes ?? []) as LeadDetail["otherCodes"] };
}

function expiry(days: number | null): string | null {
  return days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
}

/** Inserta un código nuevo; si choca con uno existente (improbable con 50 bits), prueba otro. */
async function insertCode(companyId: string, email: string | null, expiresDays: number | null, lang: Lang): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const res = await db().from("access_codes").insert({ code, company_id: companyId, email, expires_at: expiry(expiresDays), lang });
    if (!res.error) return code;
    if (res.error.code !== "23505") throw new Error(`Supabase (access_codes insert): ${res.error.message}`);
  }
  throw new Error("Could not generate a unique code");
}

export async function createCompany(input: CompanyInput): Promise<string> {
  await requireAdmin();
  const { email, expiresDays, lang, ...company } = input;
  const row = must(await db().from("companies").insert(company).select("id").single(), "companies insert") as { id: string };
  return insertCode(row.id, email, expiresDays, lang);
}

/** Otro código para una empresa existente (p. ej. otro contacto, o el anterior venció). Conserva el idioma del link. */
export async function addCode(fromCode: string, email: string | null, expiresDays: number | null): Promise<string | null> {
  await requireAdmin();
  const src = must(await db().from("access_codes").select("company_id, lang").eq("code", fromCode).maybeSingle(), "access_codes") as {
    company_id: string | null;
    lang: string;
  } | null;
  if (!src?.company_id) return null;
  return insertCode(src.company_id, email, expiresDays, isLang(src.lang) ? src.lang : "en");
}

/**
 * "Mark delivered": el regalo de este código se entregó. Solo si estaba pendiente (no pisa otra entrega).
 * Registra `gift_delivered` con quién lo marcó. Devuelve false si no había un regalo pendiente.
 */
export async function markGiftDelivered(code: string): Promise<boolean> {
  const admin = await requireAdmin();
  const rows = must(
    await db()
      .from("gifts")
      .update({ delivered_at: new Date().toISOString(), delivered_by: admin.email })
      .eq("code", code)
      .is("delivered_at", null)
      .select("kind"),
    "gifts delivered",
  ) as { kind: string }[];
  if (!rows.length) return false;
  must(await db().from("events").insert({ code, type: "gift_delivered", payload: { gift: rows[0].kind, by: admin.email } }), "events insert");
  return true;
}
