import "server-only";
import { Bar } from "@/components/ui/Bar";
import { fill, phase1, usd } from "@/lib/config";
import { phase1Result, teamScores } from "@/lib/scoring";
import { team } from "@/lib/server/team";
import type { Answers, CalcOverrides } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

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
    <section className="grid gap-[18px] border-2 border-dashed border-rule px-[18px] py-4 min-[561px]:px-6">
      <div className="label-mono text-link">{team.title}</div>
      <div className="grid gap-3.5 min-[561px]:grid-cols-3">
        {axes.map(([k, n]) => (
          <div key={k}>
            <div className="label-mono text-muted">{team.axes[k].label}</div>
            <div className="numeral mt-1 text-[34px]">{n}</div>
            <div className="mt-1.5">
              <Bar value={n} />
            </div>
            <p className="mt-1.5 text-sm text-muted">{team.axes[k].note}</p>
          </div>
        ))}
      </div>
      <p className="bg-highlight px-[18px] py-3.5 text-lg leading-snug text-highlight-ink">{team.verdicts[t.verdict]}</p>
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
        <Badge key={f} tone="highlight">
          {f}
        </Badge>
      ))}
    </div>
  );
}
