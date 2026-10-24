import { Suspense } from "react";
import { Funnel } from "@/components/admin/Funnel";
import { LeadList } from "@/components/admin/LeadList";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { funnel } from "@/lib/admin";
import { listLeads } from "@/lib/server/admin-data";
import { adminCopy } from "@/lib/server/team";

export default function AdminPage() {
  return (
    <main>
      <Suspense fallback={<LoadingCard />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  const leads = await listLeads(); // exige sesión de admin
  const l = adminCopy.list;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>{l.eyebrow}</Eyebrow>
          <h1 className="text-[clamp(28px,5vw,40px)] tracking-[-0.02em]">{l.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {/* Descargas: <a> normal, no <Link>, para que el navegador guarde el archivo. */}
          <a href="/admin/export?status=sent" className={buttonClass("line")}>
            {l.exportSent}
          </a>
          <a href="/admin/export" className={buttonClass("line")}>
            {l.exportAll}
          </a>
          <ButtonLink href="/admin/new">{l.newCompany}</ButtonLink>
        </div>
      </div>
      <Funnel steps={funnel(leads.map((x) => x.status))} />
      <LeadList leads={leads} />
    </div>
  );
}
