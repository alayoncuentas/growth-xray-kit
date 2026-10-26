import { STATUSES, toCsv, type CodeStatus } from "@/lib/admin";
import { listLeads } from "@/lib/server/admin-data";
import { getAdmin } from "@/lib/server/auth";
import { appOrigin } from "@/lib/server/origin";

// GET /admin/export[?status=sent] — CSV de códigos para la herramienta de correos.
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });

  const status = new URL(request.url).searchParams.get("status");
  const filter = STATUSES.includes(status as CodeStatus) ? (status as CodeStatus) : null;
  const origin = await appOrigin();

  const rows = (await listLeads())
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
    }));

  const csv = toCsv(rows, ["email", "business", "city", "state", "industry", "website", "phone", "code", "link", "status", "lang", "answered_lang", "expires_at", "created_at"]);
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="growth-xray-codes-${filter ?? "all"}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
