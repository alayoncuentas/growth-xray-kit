import Link from "next/link";
import { Suspense } from "react";
import { Funnel } from "@/components/admin/Funnel";
import { LeadList } from "@/components/admin/LeadList";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { filterBySource, funnel, giftCounts, parseSource, SOURCES, type Source } from "@/lib/admin";
import { fill } from "@/lib/config";
import { listLeads } from "@/lib/server/admin-data";
import { adminCopy } from "@/lib/server/team";

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main>
      <Suspense fallback={<LoadingCard />}>
        {searchParams.then((sp) => (
          <Dashboard source={parseSource(sp.source)} deleted={sp.deleted === "1"} />
        ))}
      </Suspense>
    </main>
  );
}

async function Dashboard({ source, deleted }: { source: Source | null; deleted: boolean }) {
  const leads = filterBySource(await listLeads(), source); // exige sesión de admin
  const l = adminCopy.list;
  const q = source ? `source=${source}` : "";
  const gifts = giftCounts(
    leads.map((x) => x.gift),
    new Date(),
  );
  return (
    <div className="grid gap-5">
      {deleted && (
        <p role="status" className="border-2 border-l-[6px] border-line border-l-accent bg-card px-4 py-3 text-sm">
          {l.deleted}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>{l.eyebrow}</Eyebrow>
          <h1 className="display text-[clamp(28px,5vw,40px)]">{l.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {/* Descargas: <a> normal, no <Link>, para que el navegador guarde el archivo. Respetan el filtro de origen. */}
          <ButtonLink href="/admin/preview" variant="line">
            {adminCopy.preview.nav}
          </ButtonLink>
          <a href={`/admin/export?status=sent${q ? `&${q}` : ""}`} className={buttonClass("line")}>
            {l.exportSent}
          </a>
          <a href={`/admin/export${q ? `?${q}` : ""}`} className={buttonClass("line")}>
            {l.exportAll}
          </a>
          <ButtonLink href="/admin/new">{l.newCompany}</ButtonLink>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={l.filterLabel} className="flex text-sm">
          {[null, ...SOURCES].map((s) => {
            const active = s === source;
            return (
              <Link
                key={s ?? "all"}
                href={s ? `/admin?source=${s}` : "/admin"}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-4 px-3 font-bold ${active ? "border-highlight text-ink" : "border-line text-ink-2 hover:text-ink"}`}
              >
                {s ? adminCopy.sources[s] : l.filterAll}
              </Link>
            );
          })}
        </nav>
        <p className="text-sm">
          <span className="label-mono mr-2 text-ink-2">{l.giftsTitle}</span>
          <span className={gifts.overdue ? "text-danger" : ""}>{fill(l.giftsSummary, gifts)}</span>
        </p>
      </div>

      <Funnel steps={funnel(leads.map((x) => x.status))} />
      <LeadList leads={leads} />
    </div>
  );
}
