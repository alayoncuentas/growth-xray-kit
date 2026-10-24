import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { ResultsView } from "@/components/results/ResultsView";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { checkAccess } from "@/lib/server/access";
import { initialState } from "@/lib/server/diagnostic";
import { DiagnosticProvider } from "@/lib/store";

export default function ResultsPage({ params, searchParams }: PageProps<"/x/[code]/results">) {
  return (
    <Container wide>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([{ code }, sp]) => (
          <Results code={code} sample={sp.sample} frame={sp.frame === "1"} />
        ))}
      </Suspense>
    </Container>
  );
}

async function Results({ code: raw, sample, frame }: { code: string; sample: unknown; frame: boolean }) {
  const r = await checkAccess(raw);
  if (!r.ok) notFound();
  const { code, company } = r.access;
  return (
    <DiagnosticProvider code={code} initial={await initialState(r.access, sample)}>
      <BusinessMarker business={company?.business ?? null} />
      <ResultsView code={code} company={company} />
      <PreviewChrome access={r.access} frame={frame} />
    </DiagnosticProvider>
  );
}
