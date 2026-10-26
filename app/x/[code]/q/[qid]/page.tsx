import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { QuestionScreen } from "@/components/question/QuestionScreen";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { phase1 } from "@/lib/config";
import { LangProvider } from "@/lib/i18n";
import { businessFirst, needsBusinessStep, progress, stepHref } from "@/lib/flow";
import { checkAccess } from "@/lib/server/access";
import { initialState } from "@/lib/server/diagnostic";
import { DiagnosticProvider } from "@/lib/store";

export default function QuestionPage({ params, searchParams }: PageProps<"/x/[code]/q/[qid]">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([p, sp]) => (
          <Question {...p} sample={sp.sample} frame={sp.frame === "1"} />
        ))}
      </Suspense>
    </Container>
  );
}

async function Question({ code: raw, qid, sample, frame }: { code: string; qid: string; sample: unknown; frame: boolean }) {
  const r = await checkAccess(raw);
  if (!r.ok) return <CodeError reason={r.reason} />;
  const { code, company } = r.access;
  // También descarta la pregunta de rubro cuando el código ya la trae.
  if (!progress(phase1, qid, company?.industry)) notFound();
  // Camino abierto sin nombre: después del rubro van primero los datos del negocio.
  const needsBusiness = needsBusinessStep({ open: r.access.open, business: company?.business });
  if (businessFirst(phase1, qid, { knownIndustry: company?.industry, needsBusiness })) redirect(stepHref(code, { kind: "business" }));
  return (
    <LangProvider lang={r.access.lang} code={code}>
      <DiagnosticProvider code={code} initial={await initialState(r.access, sample)}>
        <BusinessMarker business={company?.business ?? null} />
        <QuestionScreen code={code} qid={qid} company={company} needsBusiness={needsBusiness} open={r.access.open} />
        <PreviewChrome access={r.access} frame={frame} />
      </DiagnosticProvider>
    </LangProvider>
  );
}
