import "server-only";
import type { FunnelStep } from "@/lib/admin";
import { adminCopy } from "@/lib/server/team";

/** Embudo acumulado por estado del código. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, steps[0]?.count ?? 0);
  return (
    <section className="border-2 border-rule bg-card px-[18px] py-3.5 min-[561px]:px-6 min-[561px]:py-5">
      <h2 className="mb-3.5 text-lg uppercase">{adminCopy.funnel.title}</h2>
      <ol className="grid gap-2.5">
        {steps.map((s) => (
          <li key={s.status} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 text-sm max-[480px]:grid-cols-[90px_minmax(0,1fr)_auto]">
            <span>{adminCopy.statuses[s.status]}</span>
            <span className="h-5 overflow-hidden bg-card-2">
              <i className="block h-full bg-accent" style={{ width: `${(s.count / max) * 100}%` }} />
            </span>
            <span className="text-sm font-bold tabular-nums">
              {s.count} <span className="font-normal text-muted">· {s.pct}%</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">% {adminCopy.funnel.of}</p>
    </section>
  );
}
