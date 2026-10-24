import "server-only";
import type { FunnelStep } from "@/lib/admin";
import { adminCopy } from "@/lib/server/team";

/** Embudo acumulado por estado del código. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, steps[0]?.count ?? 0);
  return (
    <section className="rounded-panel border border-line bg-card p-5">
      <h2 className="mb-3.5 text-xl">{adminCopy.funnel.title}</h2>
      <ol className="grid gap-2.5">
        {steps.map((s) => (
          <li key={s.status} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 text-sm max-[480px]:grid-cols-[90px_minmax(0,1fr)_auto]">
            <span>{adminCopy.statuses[s.status]}</span>
            <span className="h-5 overflow-hidden rounded bg-paper">
              <i className="block h-full rounded bg-accent" style={{ width: `${(s.count / max) * 100}%` }} />
            </span>
            <span className="font-mono text-[13px] tabular-nums">
              {s.count} <span className="text-muted">· {s.pct}%</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-muted">% {adminCopy.funnel.of}</p>
    </section>
  );
}
