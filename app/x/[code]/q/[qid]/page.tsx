import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { QuestionScreen } from "@/components/question/QuestionScreen";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { phase1 } from "@/lib/config";
import { progress } from "@/lib/flow";
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
  return (
    <DiagnosticProvider code={code} initial={await initialState(r.access, sample)}>
      <BusinessMarker business={company?.business ?? null} />
      <QuestionScreen code={code} qid={qid} company={company} />
      <PreviewChrome access={r.access} frame={frame} />
    </DiagnosticProvider>
  );
}
