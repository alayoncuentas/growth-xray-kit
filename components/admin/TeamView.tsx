import "server-only";
import { Bar } from "@/components/ui/Bar";
import { fill, phase1, usd } from "@/lib/config";
import { phase1Result, teamScores } from "@/lib/scoring";
import { team } from "@/lib/server/team";
import type { Answers, CalcOverrides } from "@/lib/types";

/** "Vista del equipo" del prototipo: Need / Potential / Readiness, veredicto, alertas y datos para la llamada. */
export function TeamView({ code, answers, calc }: { code: string; answers: Answers; calc: CalcOverrides }) {
  const res = phase1Result(phase1, answers, calc);
  const t = teamScores(phase1, answers, res.pillars, res.avg, res.calc);
  const archName = phase1.archetypes[res.archetype].name;
  const opening = fill(team.openingLine, { archetype: archName.replace(/^The /, "the ").toLowerCase() });
  const axes = [
    ["need", t.need],
    ["potential", t.potential],
    ["readiness", t.readiness],
  ] as const;

  return (
    <section className="grid gap-[18px] rounded-panel border-2 border-dashed border-line p-5">
      <div className="label-mono text-xs text-accent">{team.title}</div>
      <div className="grid gap-3.5 min-[561px]:grid-cols-3">
        {axes.map(([k, n]) => (
          <div key={k}>
            <div className="label-mono text-[11px] text-muted">{team.axes[k].label}</div>
            <div className="font-display text-[34px] leading-[1.1] font-bold tabular-nums">{n}</div>
            <div className="mt-1.5">
              <Bar value={n} />
            </div>
            <p className="mt-1.5 text-[13px] text-muted">{team.axes[k].note}</p>
          </div>
        ))}
      </div>
      <p className="rounded-lg bg-accent-soft px-3.5 py-3 font-semibold">{team.verdicts[t.verdict]}</p>
      {t.flags.length > 0 && <Flags flags={t.flags.map((f) => team.flags[f])} />}
      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">{team.kv.code}</dt>
        <dd className="font-mono">{code}</dd>
        <dt className="text-muted">{team.kv.monthly}</dt>
        <dd>
          {usd(res.calc.monthly)} ({team.kv.cautious}: {usd(res.calc.cautious)})
        </dd>
        <dt className="text-muted">{team.kv.ads}</dt>
        <dd>{res.spend ? `${usd(res.spend)}/mo` : team.kv.noAds}</dd>
        <dt className="text-muted">{team.kv.opening}</dt>
        <dd>{opening}</dd>
      </dl>
    </section>
  );
}

export function Flags({ flags }: { flags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((f) => (
        <span key={f} className="rounded-md bg-leak-soft px-2 py-1.5 font-mono text-xs leading-none font-medium text-leak">
          {f}
        </span>
      ))}
    </div>
  );
}
