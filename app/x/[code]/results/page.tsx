import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { ResultsView } from "@/components/results/ResultsView";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { needsBusinessStep, stepHref } from "@/lib/flow";
import { checkAccess } from "@/lib/server/access";
import { initialState } from "@/lib/server/diagnostic";
import { LangProvider } from "@/lib/i18n";
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
  if (!r.ok) return <CodeError reason={r.reason} />;
  const { code, company } = r.access;
  if (needsBusinessStep({ open: r.access.open, business: company?.business })) redirect(stepHref(code, { kind: "business" }));
  return (
    <LangProvider lang={r.access.lang} code={code}>
      <DiagnosticProvider code={code} initial={await initialState(r.access, sample)}>
        <BusinessMarker business={company?.business ?? null} />
        <ResultsView code={code} company={company} open={r.access.open} />
        <PreviewChrome access={r.access} frame={frame} />
      </DiagnosticProvider>
    </LangProvider>
  );
}
