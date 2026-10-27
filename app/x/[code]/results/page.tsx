import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { ResultsView } from "@/components/results/ResultsView";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { getConfig, phase1 } from "@/lib/config";
import { isSampleId } from "@/lib/preview";
import { maskEmail } from "@/lib/email";
import { needsBusinessStep, needsEmailStep, resultsMode, stepHref } from "@/lib/flow";
import { giftForAnswers } from "@/lib/gifts";
import { checkAccess } from "@/lib/server/access";
import { initialState, loadPhase1 } from "@/lib/server/diagnostic";
import { offerGiftSafe, type Gift } from "@/lib/server/gifts";
import { LangProvider } from "@/lib/i18n";
import { DiagnosticProvider, type DiagnosticState } from "@/lib/store";

export default function ResultsPage({ params, searchParams }: PageProps<"/x/[code]/results">) {
  return (
    <Container wide>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([{ code }, sp]) => (
          <Results
            code={code}
            sample={sp.sample}
            frame={sp.frame === "1"}
            skipped={sp.skip === "1"}
            unlocked={sp.unlocked === "1"}
            previewPartial={sp.partial === "1"}
          />
        ))}
      </Suspense>
    </Container>
  );
}

async function Results({
  code: raw,
  sample,
  frame,
  skipped,
  unlocked,
  previewPartial,
}: {
  code: string;
  sample: unknown;
  frame: boolean;
  skipped: boolean;
  unlocked: boolean;
  previewPartial: boolean;
}) {
  const r = await checkAccess(raw);
  if (!r.ok) return <CodeError reason={r.reason} />;
  const { code, company, open, email, preview } = r.access;
  if (needsBusinessStep({ open, business: company?.business })) redirect(stepHref(code, { kind: "business" }));

  let initial: DiagnosticState;
  let gift: Gift | null = null;
  if (preview) {
    initial = await initialState(r.access, sample);
  } else {
    const saved = await loadPhase1(code);
    // Al terminar la fase 1 sin correo, primero la pantalla del correo (salvo que la haya omitido).
    if (needsEmailStep({ hasEmail: !!email, completed: saved.completed, skipped })) redirect(`/x/${encodeURIComponent(code)}/email`);
    initial = { answers: saved.answers, calc: saved.calc };
    // Con correo y la fase terminada se muestra el regalo: queda ofrecido (y fijo) desde ahora.
    if (email && saved.completed) gift = await offerGiftSafe(code);
  }
  // Vista previa: completo, o el parcial con ?partial=1 (/admin/preview). Nada se lee ni se escribe.
  const mode = preview ? (previewPartial ? "partial" : "full") : resultsMode({ open, hasEmail: !!email });
  const giftKind = giftForAnswers(phase1, initial.answers, initial.calc);
  // Vista previa con respuestas de muestra: el bloque del regalo que tocaría, con un correo de ejemplo enmascarado.
  const offered =
    gift && email
      ? { kind: gift.kind, to: maskEmail(email) }
      : preview && isSampleId(sample)
        ? { kind: giftKind, to: maskEmail(getConfig(r.access.lang).copy.capture.emailPlaceholder) }
        : null;

  return (
    <LangProvider lang={r.access.lang} code={code}>
      <DiagnosticProvider code={code} initial={initial}>
        <BusinessMarker business={company?.business ?? null} />
        <ResultsView
          code={code}
          company={company}
          open={open}
          mode={mode}
          gift={giftKind}
          unlockedTo={unlocked && mode === "full" && email ? maskEmail(email) : null}
          offered={offered}
        />
        <PreviewChrome access={r.access} frame={frame} />
      </DiagnosticProvider>
    </LangProvider>
  );
}
