import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BusinessForm } from "@/components/gate/BusinessForm";
import { CodeError } from "@/components/gate/CodeError";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { getConfig } from "@/lib/config";
import { INDUSTRY_QID, stepHref } from "@/lib/flow";
import { LangProvider } from "@/lib/i18n";
import { checkAccess } from "@/lib/server/access";

// Datos del negocio: solo en el camino abierto, después de la pregunta de rubro (docs/OPEN_ENTRY.md §9).
export default function BusinessPage({ params, searchParams }: PageProps<"/x/[code]/business">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([{ code }, sp]) => (
          <Business code={code} frame={sp.frame === "1"} />
        ))}
      </Suspense>
    </Container>
  );
}

async function Business({ code: raw, frame }: { code: string; frame: boolean }) {
  const r = await checkAccess(raw);
  if (!r.ok) return <CodeError reason={r.reason} />;
  const { code, company, lang } = r.access;
  // Una empresa invitada ya tiene sus datos (los carga el equipo): esta pantalla no existe para ella.
  if (!r.access.open && !r.access.preview) redirect(`/x/${encodeURIComponent(code)}`);
  const t = getConfig(lang).copy.business;
  return (
    <LangProvider lang={lang} code={code}>
      <Card>
        <h1 className="mb-2 text-[clamp(26px,5vw,36px)] tracking-[-0.02em]">{t.title}</h1>
        <p className="text-muted">{t.sub}</p>
        <BusinessForm
          code={code}
          backHref={stepHref(code, { kind: "question", qid: INDUSTRY_QID })}
          initial={{ name: company?.business ?? "", website: company?.website?.replace(/^https:\/\//, "") ?? "" }}
        />
      </Card>
      <PreviewChrome access={r.access} frame={frame} />
    </LangProvider>
  );
}
