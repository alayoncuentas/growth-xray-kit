import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CopyButton } from "@/components/admin/CopyButton";
import { NewCodeForm } from "@/components/admin/NewCodeForm";
import { StatusBadge, when } from "@/components/admin/Status";
import { TeamView } from "@/components/admin/TeamView";
import { Panel } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { EXPIRY_CHOICES } from "@/lib/admin";
import { splitAnswers } from "@/lib/answers";
import { fill, getQuestion, isChoice, phase1, usd } from "@/lib/config";
import { calcValues, visibleQuestions } from "@/lib/scoring";
import { getLead, type LeadDetail } from "@/lib/server/admin-data";
import { appOrigin } from "@/lib/server/origin";
import { adminCopy } from "@/lib/server/team";

export default function LeadPage({ params, searchParams }: PageProps<"/admin/c/[code]">) {
  return (
    <main>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([p, sp]) => (
          <Lead code={decodeURIComponent(p.code).toUpperCase()} created={sp.created === "1"} />
        ))}
      </Suspense>
    </main>
  );
}

async function Lead({ code, created }: { code: string; created: boolean }) {
  const lead = await getLead(code); // exige sesión de admin
  if (!lead) notFound();
  const d = adminCopy.detail;
  const co = lead.company;
  const link = `${await appOrigin()}/x/${lead.code}`;
  const saved = splitAnswers(phase1, lead.answers);
  const started = lead.answers.length > 0;
  const last = lead.phase1?.last_question_id ? getQuestion(lead.phase1.last_question_id)?.prompt : null;
  const progress = lead.phase1?.completed_at
    ? fill(d.completed, { date: when(lead.phase1.completed_at) })
    : started
      ? fill(d.inProgress, { q: last ?? "—" })
      : d.notStarted;

  return (
    <div className="grid gap-5">
      <div>
        <Link href="/admin" className="text-sm text-muted underline underline-offset-2 hover:text-ink">
          ← {d.back}
        </Link>
      </div>
      <header>
        <Eyebrow>{[co?.city, co?.state].filter(Boolean).join(", ") || adminCopy.list.eyebrow}</Eyebrow>
        <h1 className="mb-2 text-[clamp(28px,5vw,40px)] tracking-[-0.02em]">{co?.name ?? lead.code}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge status={lead.status} expired={lead.expired} />
          <span className="text-muted">
            {d.progress}: {progress}
          </span>
        </div>
      </header>

      <section className={`grid gap-2.5 rounded-panel border p-5 ${created ? "border-accent bg-accent-soft" : "border-line bg-card"}`}>
        <div className="label-mono text-xs text-muted">{d.link}</div>
        <div className="flex flex-wrap items-center gap-2.5">
          <code className="min-w-0 font-mono text-lg font-medium tracking-[0.06em] break-all">{lead.code}</code>
          <CopyButton text={lead.code} label={d.copy} done={d.copied} />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <a href={link} className="min-w-0 text-sm break-all text-accent underline underline-offset-2" target="_blank" rel="noreferrer">
            {link}
          </a>
          <CopyButton text={link} label={d.copy} done={d.copied} />
        </div>
        <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">{d.contact}</dt>
          <dd className="break-all">{lead.email ?? "—"}</dd>
          <dt className="text-muted">{d.expires}</dt>
          <dd>{lead.expires_at ? when(lead.expires_at) : d.never}</dd>
          <dt className="text-muted">{d.codeLang}</dt>
          <dd>{adminCopy.langs[lead.lang]}</dd>
          <dt className="text-muted">{d.answeredLang}</dt>
          <dd>{lead.phase1?.lang ? adminCopy.langs[lead.phase1.lang] : <span className="text-muted">{d.notYet}</span>}</dd>
        </dl>
      </section>

      <div className="grid gap-5 min-[861px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          {started ? (
            <TeamView code={lead.code} answers={saved.answers} calc={saved.calc} />
          ) : (
            <p className="rounded-panel border-2 border-dashed border-line p-5 text-muted">{d.teamPending}</p>
          )}
          <Panel title={d.answersTitle}>
            <Answers lead={lead} />
          </Panel>
        </div>
        <div className="grid content-start gap-5">
          <Panel title={d.companyTitle}>
            <CompanyInfo lead={lead} />
          </Panel>
          <Panel title={d.eventsTitle}>
            <Events lead={lead} />
          </Panel>
          <Panel title={d.otherCodes}>
            {lead.otherCodes.length > 0 && (
              <ul className="mb-4 grid gap-2">
                {lead.otherCodes.map((c) => (
                  <li key={c.code} className="flex flex-wrap items-center gap-2.5">
                    <Link href={`/admin/c/${c.code}`} className="font-mono text-sm underline underline-offset-2">
                      {c.code}
                    </Link>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
            <NewCodeForm
              fromCode={lead.code}
              expiryChoices={[...EXPIRY_CHOICES]}
              t={{
                newCode: d.newCode,
                newCodeEmail: d.newCodeEmail,
                expiresDays: adminCopy.form.expiresDays,
                expiresNever: adminCopy.form.expiresNever,
                errorEmail: adminCopy.login.errorEmail,
              }}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Answers({ lead }: { lead: LeadDetail }) {
  const d = adminCopy.detail;
  if (!lead.answers.length) return <p className="text-muted">{d.noAnswers}</p>;
  const saved = splitAnswers(phase1, lead.answers);
  const industry = lead.company?.industry;
  const visible = new Set(visibleQuestions(phase1, industry).map((q) => q.id));
  const c = calcValues(phase1, saved.answers, saved.calc);

  return (
    <ol className="grid gap-3.5">
      {phase1.questions.map((q, i) => {
        let value: React.ReactNode;
        if (!visible.has(q.id)) {
          const opt = isChoice(q) ? q.options.find((o) => o.id === industry)?.label : null;
          value = <span className="text-muted">{opt ? `${opt} · ${d.notAsked}` : d.notAsked}</span>;
        } else if (isChoice(q)) {
          const a = saved.answers[q.id];
          const ids = Array.isArray(a) ? a : a ? [a] : [];
          value = ids.length ? ids.map((id) => q.options.find((o) => o.id === id)?.label ?? id).join(" · ") : <span className="text-muted">{d.unanswered}</span>;
        } else {
          value = saved.calcSaved ? (
            <ul className="grid gap-0.5">
              {q.fields.map((f) => (
                <li key={f.id}>
                  {f.label}:{" "}
                  <b className="font-mono font-medium">{f.unit === "USD" ? usd(c[f.id]) : f.unit === "%" ? `${c[f.id]}%` : c[f.id]}</b>
                  {saved.calc[f.id] === undefined && <span className="text-muted"> ({d.calcDefault})</span>}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted">{d.unanswered}</span>
          );
        }
        return (
          <li key={q.id} className="grid gap-1 border-b border-line pb-3 text-sm last:border-b-0 last:pb-0">
            <span className="text-muted">
              {i + 1}. {q.prompt}
            </span>
            <span className="font-medium">{value}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CompanyInfo({ lead }: { lead: LeadDetail }) {
  const d = adminCopy.detail;
  const f = adminCopy.form;
  const co = lead.company;
  if (!co) return <p className="text-muted">—</p>;
  const industry = (() => {
    const q = phase1.questions.find((x) => x.id === "industry");
    return q && isChoice(q) ? q.options.find((o) => o.id === co.industry)?.label : null;
  })();
  const rows: [string, React.ReactNode][] = [
    [f.industry, industry ?? f.industryUnknown],
    [f.website, co.website ? <a href={co.website} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2">{co.website}</a> : "—"],
    [f.phone, co.phone ?? "—"],
    [f.placeId, co.google_place_id ? <span className="font-mono text-xs break-all">{co.google_place_id}</span> : "—"],
  ];
  const o = co.outside_view;
  return (
    <>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-4 mb-1.5 text-base">{d.outsideTitle}</h3>
      {o ? (
        <p className="text-sm">
          <span className="text-muted">{o.date}:</span> {o.text} <b>{o.reply}</b> ({o.replyGap}). {o.reviews}; {o.lastReview}.
        </p>
      ) : (
        <p className="text-sm text-muted">{d.noOutside}</p>
      )}
    </>
  );
}

function Events({ lead }: { lead: LeadDetail }) {
  if (!lead.events.length) return <p className="text-muted">{adminCopy.detail.noEvents}</p>;
  return (
    <ol className="grid max-h-[360px] gap-1.5 overflow-y-auto text-sm">
      {lead.events.map((e, i) => {
        const qid = typeof e.payload.question_id === "string" ? e.payload.question_id : null;
        return (
          <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <span className="font-mono text-xs text-muted tabular-nums">{when(e.at)}</span>
            <span>
              <b className="font-mono text-xs font-medium">{e.type}</b>
              {qid && <span className="text-muted"> · {qid}</span>}
              {e.type === "link_opened" && e.payload.resumed === true && <span className="text-muted"> · resumed</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
