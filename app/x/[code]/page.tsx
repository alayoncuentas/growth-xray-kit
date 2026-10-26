import Link from "next/link";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { LinkOpened } from "@/components/gate/LinkOpened";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { fill, getConfig } from "@/lib/config";
import { answeredCount, resumeTarget } from "@/lib/answers";
import { businessFirst, firstQuestion, needsBusinessStep, stepHref } from "@/lib/flow";
import { checkAccess } from "@/lib/server/access";
import { emptyPhase1, loadPhase1 } from "@/lib/server/diagnostic";
import { LangProvider } from "@/lib/i18n";
import { DiagnosticProvider } from "@/lib/store";

export default function WelcomePage({ params, searchParams }: PageProps<"/x/[code]">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([{ code }, sp]) => (
          <Welcome code={code} frame={sp.frame === "1"} />
        ))}
      </Suspense>
    </Container>
  );
}

async function Welcome({ code: raw, frame }: { code: string; frame: boolean }) {
  const r = await checkAccess(raw);
  if (!r.ok) return <CodeError reason={r.reason} />;
  const { code, company: co, lang } = r.access;
  const cfg = getConfig(lang);
  const w = cfg.copy.welcome;
  const o = co?.outside;
  const base = `/x/${encodeURIComponent(code)}`;
  const firstHref = `${base}/q/${firstQuestion(cfg, co?.industry).id}`;

  // Retomar: si ya hay respuestas guardadas, la bienvenida lleva a la primera pregunta pendiente.
  const saved = r.access.preview ? emptyPhase1() : await loadPhase1(code); // la vista previa no lee la base
  const { done, total } = answeredCount(cfg, saved, co?.industry);
  const target = resumeTarget(cfg, saved, co?.industry);
  const mode = saved.completed ? "done" : done > 0 ? "resume" : "new";
  const title = mode === "done" ? w.doneTitle : mode === "resume" ? w.resumeTitle : co?.business ? w.titleKnown : w.titleGeneric;
  const sub = mode === "done" ? w.doneSub : mode === "resume" ? fill(w.resumeSub, { done, total }) : w.sub;
  // Camino abierto sin nombre: retomar después del rubro pasa primero por los datos del negocio.
  const needsBusiness = needsBusinessStep({ open: r.access.open, business: co?.business });
  const resumeQid = mode === "done" || target.kind === "results" ? null : target.qid;
  const ctaHref =
    mode === "new"
      ? firstHref
      : businessFirst(cfg, resumeQid, { knownIndustry: co?.industry, needsBusiness })
        ? stepHref(code, { kind: "business" })
        : resumeQid
          ? `${base}/q/${resumeQid}`
          : `${base}/results`;
  const named = !!co?.business; // una empresa abierta todavía sin nombre se saluda como sin empresa

  return (
    <LangProvider lang={lang} code={code}>
      <Card>
        {!r.access.preview && <LinkOpened code={code} />}
        <DiagnosticProvider code={code} initial={{ answers: saved.answers, calc: saved.calc }}>
          <BusinessMarker business={co?.business ?? null} />
        </DiagnosticProvider>
        <Eyebrow>{named ? [co!.business, co!.city].filter(Boolean).join(" · ") : w.eyebrowGeneric}</Eyebrow>
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
            {r.access.open ? w.backOpen : w.back}
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
      <PreviewChrome access={r.access} frame={frame} />
    </LangProvider>
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
