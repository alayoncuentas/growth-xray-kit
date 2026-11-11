import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { phase2 } from "@/lib/config";
import { phase2Href, resumeTarget2 } from "@/lib/phase2";
import { checkAccess } from "@/lib/server/access";
import { enforceGate, phase2PageData } from "@/lib/server/phase2-page";

// Entrada a la fase 2 ("Continue to Phase 2"; docs/SPEC.md §4): sin correo, la pantalla del correo; sin la fase 1
// terminada, la bienvenida; si no, la primera pregunta visible sin responder (o, si no falta ninguna, la última pausa).
export default function Phase2EntryPage({ params, searchParams }: PageProps<"/x/[code]/phase-2">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([{ code }, sp]) => (
          <Entry code={code} sample={sp.sample} />
        ))}
      </Suspense>
    </Container>
  );
}

async function Entry({ code: raw, sample }: { code: string; sample: unknown }) {
  const r = await checkAccess(raw);
  if (!r.ok) return <CodeError reason={r.reason} />;
  const d = await phase2PageData(r.access, sample);
  enforceGate(r.access.code, d.gate);
  redirect(phase2Href(phase2, r.access.code, resumeTarget2(phase2, d.p2, d.p1.situation), d.query));
}
