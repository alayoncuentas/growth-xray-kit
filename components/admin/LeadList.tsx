import "server-only";
import Link from "next/link";
import { giftState, industryLabel, utmSummary } from "@/lib/admin";
import { fill, phase1, usd } from "@/lib/config";
import type { LeadRow } from "@/lib/server/admin-data";
import { adminCopy, team } from "@/lib/server/team";
import type { ArchetypeId } from "@/lib/types";
import type { TeamFlag } from "@/lib/scoring";
import { Flags } from "./TeamView";
import { StatusBadge, when } from "./Status";

/** Lista de empresas. En el teléfono cada fila es una tarjeta; desde 860 px, una tabla. */
export function LeadList({ leads }: { leads: LeadRow[] }) {
  const l = adminCopy.list;
  if (!leads.length) return <p className="rounded-panel border border-line bg-card p-5 text-muted">{l.empty}</p>;

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-card">
      <div className="label-mono hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_90px_90px_minmax(0,1.4fr)] gap-3 border-b border-line px-4 py-3 text-[11px] text-muted min-[860px]:grid">
        <span>{l.colBusiness}</span>
        <span>{l.colStatus}</span>
        <span>{l.colArchetype}</span>
        <span>{l.colScores}</span>
        <span>{l.colMonthly}</span>
        <span>{l.colFlags}</span>
      </div>
      <ul>
        {leads.map((lead) => {
          const s = lead.phase1?.scores;
          const arch = s?.archetype ? phase1.archetypes[s.archetype as ArchetypeId]?.name : null;
          return (
            <li key={lead.code} className="border-b border-line last:border-b-0">
              <Link
                href={`/admin/c/${lead.code}`}
                className="grid gap-2 px-4 py-3.5 hover:bg-paper/60 min-[860px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_90px_90px_minmax(0,1.4fr)] min-[860px]:items-center min-[860px]:gap-3"
              >
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <b className={`truncate ${lead.company?.name ? "" : "font-medium text-muted"}`}>{lead.company?.name ?? l.unnamed}</b>
                    {lead.source === "open" && (
                      <span className="label-mono flex-none rounded-full border border-accent px-1.5 py-0.5 text-[10px] leading-none text-accent">
                        {adminCopy.sources.open}
                      </span>
                    )}
                    {/* Idioma en que respondió; si todavía no respondió, el del link. Fuera del texto truncado para que siempre se vea. */}
                    <span
                      title={lead.phase1?.lang ? fill(l.langTitle, { lang: adminCopy.langs[lead.phase1.lang] }) : `${adminCopy.detail.codeLang}: ${adminCopy.langs[lead.lang]}`}
                      className="flex-none rounded border border-line px-1 font-mono text-[11px] leading-[1.4] text-muted"
                    >
                      {(lead.phase1?.lang ?? lead.lang).toUpperCase()}
                    </span>
                  </span>
                  <span className="block truncate font-mono text-xs text-muted">
                    {[
                      lead.code,
                      [lead.company?.city, lead.company?.state].filter(Boolean).join(", ") || null,
                      industryLabel(industryOptions, lead.company?.industry),
                      utmSummary(lead.company?.utm) ?? referrerHost(lead.company?.referrer),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={lead.status} expired={lead.expired} />
                  {lead.gift && <GiftChip lead={lead} />}
                  <span className="text-xs text-muted min-[860px]:hidden">{when(lead.phase1?.started_at ?? lead.created_at)}</span>
                </span>
                {s ? (
                  <>
                    <span className="text-sm">{arch}</span>
                    <span className="font-mono text-sm tabular-nums">
                      <span className="text-muted min-[860px]:hidden">{l.colScores} </span>
                      {s.need}/{s.potential}/{s.readiness}
                    </span>
                    <span className="font-mono text-sm tabular-nums">
                      <span className="text-muted min-[860px]:hidden">{l.colMonthly} </span>
                      {s.monthly_at_stake !== null ? usd(s.monthly_at_stake) : "—"}
                    </span>
                    <span>{s.flags.length ? <Flags flags={s.flags.map((f) => team.flags[f as TeamFlag] ?? f)} /> : <span className="text-muted">—</span>}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted min-[860px]:col-span-4">{l.noScores}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const industryOptions = (() => {
  const q = phase1.questions.find((x) => x.id === "industry");
  return q && q.type !== "calculator" ? q.options : [];
})();

/** Host del referrer para la lista ("www.google.com"); el detalle muestra la URL completa. */
function referrerHost(r: string | null | undefined): string | null {
  if (!r) return null;
  try {
    return new URL(r).host;
  } catch {
    return null;
  }
}

/** Regalo en la lista: tipo y días hábiles que quedan; vencido en rojo. */
function GiftChip({ lead }: { lead: LeadRow }) {
  const l = adminCopy.list;
  const g = lead.gift!;
  const st = giftState(g, new Date());
  const [tone, text] =
    st.state === "delivered"
      ? ["border-good text-good", l.giftDelivered]
      : st.state === "overdue"
        ? ["border-bad text-bad", l.giftOverdue]
        : ["border-line text-muted", fill(l.giftLeft, { n: st.daysLeft })];
  return (
    <span className={`label-mono rounded-full border px-2 py-1 text-[11px] leading-none ${tone}`} title={adminCopy.gifts[g.kind]}>
      {fill(l.giftChip, { kind: g.kind })} · {text}
    </span>
  );
}
