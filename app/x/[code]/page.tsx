import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LinkOpened } from "@/components/gate/LinkOpened";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { copy, fill, phase1 } from "@/lib/config";
import { answeredCount, resumeTarget } from "@/lib/answers";
import { firstQuestion } from "@/lib/flow";
import { checkAccess } from "@/lib/server/access";
import { loadPhase1 } from "@/lib/server/diagnostic";
import { DiagnosticProvider } from "@/lib/store";

export default function WelcomePage({ params }: PageProps<"/x/[code]">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>{params.then(({ code }) => <Welcome code={code} />)}</Suspense>
    </Container>
  );
}

async function Welcome({ code: raw }: { code: string }) {
  const r = await checkAccess(raw);
  if (!r.ok) notFound();
  const { code, company: co } = r.access;
  const w = copy.welcome;
  const o = co?.outside;
  const base = `/x/${encodeURIComponent(code)}`;
  const firstHref = `${base}/q/${firstQuestion(phase1, co?.industry).id}`;

  // Retomar: si ya hay respuestas guardadas, la bienvenida lleva a la primera pregunta pendiente.
  const saved = await loadPhase1(code);
  const { done, total } = answeredCount(phase1, saved, co?.industry);
  const target = resumeTarget(phase1, saved, co?.industry);
  const mode = saved.completed ? "done" : done > 0 ? "resume" : "new";
  const title = mode === "done" ? w.doneTitle : mode === "resume" ? w.resumeTitle : co ? w.titleKnown : w.titleGeneric;
  const sub = mode === "done" ? w.doneSub : mode === "resume" ? fill(w.resumeSub, { done, total }) : w.sub;
  const ctaHref =
    mode === "new" ? firstHref : mode === "done" || target.kind === "results" ? `${base}/results` : `${base}/q/${target.qid}`;

  return (
    <Card>
      <LinkOpened code={code} />
      <DiagnosticProvider code={code} initial={{ answers: saved.answers, calc: saved.calc }}>
        <BusinessMarker business={co?.business ?? null} />
      </DiagnosticProvider>
      <Eyebrow>{co ? `${co.business} · ${co.city}` : w.eyebrowGeneric}</Eyebrow>
      <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{title}</h1>
      <p className="text-muted">{sub}</p>

      <div className="mt-[22px] grid gap-3 min-[561px]:grid-cols-3">
        {w.promise.map((p: { k: string; text: string }) => (
          <div key={p.k} className="border-t-2 border-accent pt-2.5 text-sm">
            <b className="mb-1 block font-mono text-[13px] leading-[1.3] font-semibold text-accent">{p.k}</b>
            {p.text}
          </div>
        ))}
      </div>

      {o && (
        <div className="mt-6 overflow-hidden rounded-card border border-line">
          <div className="flex flex-wrap justify-between gap-2.5 bg-accent-soft px-4 py-3 font-mono text-xs leading-[1.3] font-medium tracking-[0.06em] uppercase">
            <span>{w.outsideTitle}</span>
            <span>{w.outsideBadge}</span>
          </div>
          <OutsideRow label={o.date}>
            {o.text}
            <br />
            <strong className="text-leak">{o.reply}</strong> {fill(w.outsideReplyGap, { replyGap: o.replyGap })}
          </OutsideRow>
          <OutsideRow label={w.outsideReviewsLabel}>
            {o.reviews}. <strong className="text-leak">{fill(w.outsideLatestReview, { lastReview: o.lastReview })}</strong>
          </OutsideRow>
        </div>
      )}

      <div className="mt-[26px] flex items-center justify-between gap-2.5">
        <ButtonLink href="/" variant="ghost">
          {w.back}
        </ButtonLink>
        <ButtonLink href={ctaHref}>{mode === "done" ? w.doneCta : mode === "resume" ? w.resumeCta : w.cta}</ButtonLink>
      </div>
      {mode !== "new" && (
        <p className="mt-4 text-right text-sm">
          <Link href={firstHref} className="text-muted underline underline-offset-2 hover:text-ink">
            {mode === "done" ? w.doneReview : w.resumeFromStart}
          </Link>
        </p>
      )}
    </Card>
  );
}

function OutsideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-line px-4 py-3.5 text-[15px] min-[481px]:grid-cols-[120px_1fr] min-[481px]:gap-3">
      <span className="font-mono text-xs leading-normal font-medium tracking-[0.05em] text-muted uppercase">{label}</span>
      <div>{children}</div>
    </div>
  );
}
