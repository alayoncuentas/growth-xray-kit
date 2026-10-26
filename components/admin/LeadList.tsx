import "server-only";
import Link from "next/link";
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
                    <b className="truncate">{lead.company?.name ?? "—"}</b>
                    {/* Idioma en que respondió; si todavía no respondió, el del link. Fuera del texto truncado para que siempre se vea. */}
                    <span
                      title={lead.phase1?.lang ? fill(l.langTitle, { lang: adminCopy.langs[lead.phase1.lang] }) : `${adminCopy.detail.codeLang}: ${adminCopy.langs[lead.lang]}`}
                      className="flex-none rounded border border-line px-1 font-mono text-[11px] leading-[1.4] text-muted"
                    >
                      {(lead.phase1?.lang ?? lead.lang).toUpperCase()}
                    </span>
                  </span>
                  <span className="block truncate font-mono text-xs text-muted">
                    {lead.code} · {[lead.company?.city, lead.company?.state].filter(Boolean).join(", ") || "—"}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={lead.status} expired={lead.expired} />
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
