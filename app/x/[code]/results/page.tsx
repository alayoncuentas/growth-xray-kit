import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResultsView } from "@/components/results/ResultsView";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { checkAccess } from "@/lib/server/access";

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
  return (
    <>
      <BusinessMarker business={company?.business ?? null} />
      <ResultsView code={code} company={company} />
    </>
  );
}
