import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { Phase2QuestionScreen } from "@/components/phase2/Phase2QuestionScreen";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { phase2 } from "@/lib/config";
import { LangProvider } from "@/lib/i18n";
import { getQuestion2, phase2StoreKey, progress2 } from "@/lib/phase2";
import { checkAccess } from "@/lib/server/access";
import { enforceGate, phase2PageData } from "@/lib/server/phase2-page";
import { DiagnosticProvider } from "@/lib/store";

export default function Phase2QuestionPage({ params, searchParams }: PageProps<"/x/[code]/phase-2/q/[qid]">) {
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
  if (!getQuestion2(phase2, qid)) notFound();
  const d = await phase2PageData(r.access, sample);
  enforceGate(code, d.gate);
  // Una pregunta que hoy no se muestra (situación o respuestas guardadas) lleva a la entrada, que retoma.
  // La vista previa la muestra igual: así se revisan las condicionales.
  if (!r.access.preview && !progress2(phase2, d.p2, d.p1.situation, qid)) redirect(`/x/${encodeURIComponent(code)}/phase-2`);
  return (
    <LangProvider lang={r.access.lang} code={code}>
      <DiagnosticProvider code={phase2StoreKey(code)} initial={{ answers: d.p2, calc: {} }}>
        <BusinessMarker business={company?.business ?? null} />
        <Phase2QuestionScreen code={code} qid={qid} situation={d.p1.situation} query={d.query} open={r.access.open} />
        <PreviewChrome access={r.access} frame={frame} />
      </DiagnosticProvider>
    </LangProvider>
  );
}
