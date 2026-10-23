import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResultsView } from "@/components/results/ResultsView";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { checkAccess } from "@/lib/server/access";
import { loadPhase1 } from "@/lib/server/diagnostic";
import { DiagnosticProvider } from "@/lib/store";

export default function ResultsPage({ params }: PageProps<"/x/[code]/results">) {
  return (
    <Container wide>
      <Suspense fallback={<LoadingCard />}>{params.then(({ code }) => <Results code={code} />)}</Suspense>
    </Container>
  );
}

async function Results({ code: raw }: { code: string }) {
  const r = await checkAccess(raw);
  if (!r.ok) notFound();
  const { code, company } = r.access;
  const saved = await loadPhase1(code);
  return (
    <DiagnosticProvider code={code} initial={{ answers: saved.answers, calc: saved.calc }}>
      <BusinessMarker business={company?.business ?? null} />
      <ResultsView code={code} company={company} />
    </DiagnosticProvider>
  );
}
