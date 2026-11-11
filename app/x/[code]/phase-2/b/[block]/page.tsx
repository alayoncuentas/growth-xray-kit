import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { BlockPause } from "@/components/phase2/BlockPause";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { BusinessMarker } from "@/components/ui/BusinessMarker";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { phase2 } from "@/lib/config";
import { LangProvider } from "@/lib/i18n";
import { blockDone, isPhase2Block, phase2StoreKey } from "@/lib/phase2";
import { checkAccess } from "@/lib/server/access";
import { enforceGate, phase2PageData } from "@/lib/server/phase2-page";
import { DiagnosticProvider } from "@/lib/store";

// Pausa al cerrar un bloque de la fase 2: el mini-hallazgo, "Continue" y "Save and finish later" (docs/SPEC.md §4).
export default function BlockPausePage({ params, searchParams }: PageProps<"/x/[code]/phase-2/b/[block]">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([p, sp]) => (
          <Pause {...p} sample={sp.sample} frame={sp.frame === "1"} />
        ))}
      </Suspense>
    </Container>
  );
}

async function Pause({ code: raw, block, sample, frame }: { code: string; block: string; sample: unknown; frame: boolean }) {
  const r = await checkAccess(raw);
  if (!r.ok) return <CodeError reason={r.reason} />;
  const { code, company } = r.access;
  if (!isPhase2Block(phase2, block)) notFound();
  const d = await phase2PageData(r.access, sample);
  enforceGate(code, d.gate);
  // Solo después de cerrar el bloque (la vista previa no tiene respuestas guardadas: la muestra igual).
  if (!r.access.preview && !blockDone(phase2, d.p2, d.p1.situation, block)) redirect(`/x/${encodeURIComponent(code)}/phase-2`);
  return (
    <LangProvider lang={r.access.lang} code={code}>
      <DiagnosticProvider code={phase2StoreKey(code)} initial={{ answers: d.p2, calc: {} }}>
        <BusinessMarker business={company?.business ?? null} />
        <BlockPause code={code} block={block} p1={d.p1} query={d.query} open={r.access.open} />
        <PreviewChrome access={r.access} frame={frame} />
      </DiagnosticProvider>
    </LangProvider>
  );
}
