import type { Metadata } from "next";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { ResultsBody } from "@/components/results/ResultsBody";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { getConfig } from "@/lib/config";
import { LangProvider } from "@/lib/i18n";
import { isSampleId, sampleState } from "@/lib/preview";
import { checkAccess } from "@/lib/server/access";
import { loadPhase1 } from "@/lib/server/diagnostic";

export const metadata: Metadata = { title: "Growth X-Ray", robots: { index: false, follow: false } };

// Informe de solo lectura: el link del correo al terminar la fase 1. Valida el código como /x/[code]
// (servidor, con limitación de intentos). Nunca muestra Need / Potential / Readiness ni alertas: eso es solo de /admin.
export default function SharedReportPage({ params, searchParams }: PageProps<"/r/[code]">) {
  return (
    <Container wide>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([{ code }, sp]) => (
          <Report code={code} sample={sp.sample} />
        ))}
      </Suspense>
    </Container>
  );
}

async function Report({ code: raw, sample }: { code: string; sample: unknown }) {
  const r = await checkAccess(raw);
  if (!r.ok) return <CodeError reason={r.reason} />;
  const { code, company, preview, lang, open } = r.access;
  const t = getConfig(lang).copy.report;
  const resumeHref = `/x/${encodeURIComponent(code)}`;

  // Vista previa: una muestra (?sample=leaky), sin leer la base.
  const state = preview
    ? isSampleId(sample)
      ? { ...sampleState(sample), completed: true }
      : { answers: {}, calc: {}, completed: false }
    : await loadPhase1(code);

  if (!state.completed) {
    return (
      <LangProvider lang={lang} code={code}>
        <Card>
          <BusinessMarker business={company?.business ?? null} />
          <h1 className="mb-3 text-[clamp(26px,5vw,36px)] tracking-[-0.02em]">{t.pendingTitle}</h1>
          <p className="mb-[22px] text-muted">{t.pendingSub}</p>
          <ButtonLink href={resumeHref}>{t.pendingCta}</ButtonLink>
        </Card>
      </LangProvider>
    );
  }

  return (
    <LangProvider lang={lang} code={code}>
      <BusinessMarker business={company?.business ?? null} />
      <ResultsBody answers={state.answers} calc={state.calc} company={company} eyebrow={t.eyebrow} />
      <section className="mt-5 grid gap-3 rounded-panel border border-line bg-card p-[clamp(20px,4vw,28px)]">
        <h2 className="text-xl">{t.continueTitle}</h2>
        <p className="text-muted">{open ? t.continueSubOpen : t.continueSub}</p>
        <div>
          <ButtonLink href={resumeHref} variant="line">
            {t.continueCta}
          </ButtonLink>
        </div>
      </section>
      <p className="mt-4 text-[13px] text-muted">{open ? t.readOnlyOpen : t.readOnly}</p>
    </LangProvider>
  );
}
