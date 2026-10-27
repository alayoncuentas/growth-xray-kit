import { filterBySource, parseSource, STATUSES, toCsv, utmEntries, type CodeStatus } from "@/lib/admin";
import { listLeads } from "@/lib/server/admin-data";
import { getAdmin } from "@/lib/server/auth";
import { appOrigin } from "@/lib/server/origin";

// GET /admin/export[?status=sent][&source=invited|open] — CSV de códigos para la herramienta de correos.

const CSV_COLUMNS = [
  "email", "business", "city", "state", "industry", "website", "phone", "code", "link", "status", "lang", "answered_lang",
  "expires_at", "created_at", "source", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "referrer",
  "email_consent_at", "email_consent_version", "gift", "gift_due_at", "gift_delivered_at",
] as const;
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const source = parseSource(params.get("source"));
  const filter = STATUSES.includes(status as CodeStatus) ? (status as CodeStatus) : null;
  const origin = await appOrigin();

  const rows = filterBySource(await listLeads(), source)
    .filter((l) => !filter || l.status === filter)
    .filter((l) => !filter || !l.expired) // al filtrar, solo códigos vigentes
    .map((l) => ({
      email: l.email,
      business: l.company?.name,
      city: l.company?.city,
      state: l.company?.state,
      industry: l.company?.industry,
      website: l.company?.website,
      phone: l.company?.phone,
      code: l.code,
      link: `${origin}/x/${l.code}`,
      status: l.status,
      lang: l.lang,
      answered_lang: l.phase1?.lang ?? null,
      expires_at: l.expires_at,
      created_at: l.created_at,
      source: l.source,
      ...Object.fromEntries(utmEntries(l.company?.utm)),
      referrer: l.company?.referrer ?? null,
      email_consent_at: l.consent?.at ?? null,
      email_consent_version: l.consent?.version ?? null,
      gift: l.gift?.kind ?? null,
      gift_due_at: l.gift?.due_at ?? null,
      gift_delivered_at: l.gift?.delivered_at ?? null,
    }));

  const csv = toCsv(rows as Record<string, unknown>[], [...CSV_COLUMNS]);
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="growth-xray-codes-${filter ?? "all"}${source ? `-${source}` : ""}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
