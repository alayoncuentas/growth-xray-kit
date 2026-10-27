import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CodeError } from "@/components/gate/CodeError";
import { PreviewChrome } from "@/components/preview/PreviewChrome";
import { EmailForm } from "@/components/results/EmailForm";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { fill, getConfig, phase1 } from "@/lib/config";
import { stepHref } from "@/lib/flow";
import { giftForAnswers } from "@/lib/gifts";
import { LangProvider } from "@/lib/i18n";
import { isSampleId, sampleState } from "@/lib/preview";
import { checkAccess } from "@/lib/server/access";
import { loadPhase1 } from "@/lib/server/diagnostic";

// Pantalla del correo, al terminar la fase 1 sin correo (docs/OPEN_ENTRY.md §1 y §9). En el camino abierto,
// "Skip" lleva al resultado parcial; para un invitado es opcional y lleva al resultado completo.
export default function EmailPage({ params, searchParams }: PageProps<"/x/[code]/email">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        {Promise.all([params, searchParams]).then(([{ code }, sp]) => (
          <EmailStep code={code} sample={sp.sample} frame={sp.frame === "1"} />
        ))}
      </Suspense>
    </Container>
  );
}

async function EmailStep({ code: raw, sample, frame }: { code: string; sample: unknown; frame: boolean }) {
  const r = await checkAccess(raw);
  if (!r.ok) return <CodeError reason={r.reason} />;
  const { code, lang, open, email, preview } = r.access;
  const results = stepHref(code, { kind: "results" });

  let state;
  if (preview) {
    state = isSampleId(sample) ? sampleState(sample) : { answers: {}, calc: {} };
  } else {
    if (email) redirect(results); // ya tiene correo: nada que pedir
    const saved = await loadPhase1(code);
    if (!saved.completed) redirect(`/x/${encodeURIComponent(code)}`); // la bienvenida lleva a la pregunta pendiente
    state = saved;
  }

  const t = getConfig(lang).copy;
  const gift = giftForAnswers(phase1, state.answers, state.calc);
  return (
    <LangProvider lang={lang} code={code}>
      <Card>
        <Eyebrow>{t.capture.eyebrow}</Eyebrow>
        <h1 className="mb-3 text-[clamp(28px,5.5vw,40px)] tracking-[-0.02em]">{t.capture.title}</h1>
        <p className="mb-4 text-muted">{t.capture.sub}</p>
        <p className="mb-[22px] rounded-card bg-accent-soft px-4 py-3 text-sm font-semibold">
          {fill(t.capture.gift, { giftTitle: t.gifts[gift].title })}
        </p>
        <EmailForm code={code} from="screen" gift={gift} />
        <div className="mt-5 border-t border-line pt-4">
          <ButtonLink href={`${results}?skip=1`} variant="ghost">
            {open ? t.capture.skip : t.capture.skipInvited}
          </ButtonLink>
        </div>
      </Card>
      <PreviewChrome access={r.access} frame={frame} />
    </LangProvider>
  );
}
