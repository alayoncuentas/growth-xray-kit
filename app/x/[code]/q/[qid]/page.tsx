import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QuestionScreen } from "@/components/question/QuestionScreen";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { phase1 } from "@/lib/config";
import { progress } from "@/lib/flow";
import { checkAccess } from "@/lib/server/access";
import { loadPhase1 } from "@/lib/server/diagnostic";
import { DiagnosticProvider } from "@/lib/store";

export default function QuestionPage({ params }: PageProps<"/x/[code]/q/[qid]">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>{params.then((p) => <Question {...p} />)}</Suspense>
    </Container>
  );
}

async function Question({ code: raw, qid }: { code: string; qid: string }) {
  const r = await checkAccess(raw);
  if (!r.ok) notFound();
  const { code, company } = r.access;
  // También descarta la pregunta de rubro cuando el código ya la trae.
  if (!progress(phase1, qid, company?.industry)) notFound();
  const saved = await loadPhase1(code);
  return (
    <DiagnosticProvider code={code} initial={{ answers: saved.answers, calc: saved.calc }}>
      <BusinessMarker business={company?.business ?? null} />
      <QuestionScreen code={code} qid={qid} company={company} />
    </DiagnosticProvider>
  );
}
