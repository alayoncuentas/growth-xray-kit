import { Suspense } from "react";
import { CodeForm } from "@/components/gate/CodeForm";
import { StartForm } from "@/components/gate/StartForm";
import { Arrow, Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { getConfig } from "@/lib/config";
import { LangProvider } from "@/lib/i18n";
import { browserLang } from "@/lib/server/access";
import { getAdmin } from "@/lib/server/auth";
import { openEntryEnabled } from "@/lib/server/open-entry";

export default function GatePage({ searchParams }: PageProps<"/">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>{searchParams.then((sp) => <Gate previewOpen={sp.preview === "open"} />)}</Suspense>
    </Container>
  );
}

// Sin código todavía no hay idioma de sesión: el elegido con el botón EN / ES, si no el del navegador, si no inglés.
async function Gate({ previewOpen }: { previewOpen: boolean }) {
  const lang = await browserLang();
  const { gate: g, start: s } = getConfig(lang).copy;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  // Camino abierto (OPEN_ENTRY_ENABLED): "Start my X-Ray" primero y el código como opción secundaria.
  // Apagado (o sin clave de Turnstile), el inicio es solo el ingreso con código, como siempre.
  const live = openEntryEnabled() && !!siteKey;
  // /admin/preview: ?preview=open muestra el inicio abierto aunque el flag esté apagado, con el botón inactivo
  // (sin Turnstile y sin crear nada). Solo con sesión de admin.
  const preview = !live && previewOpen && !!(await getAdmin());
  const open = live || preview;
  return (
    <LangProvider lang={lang}>
      <Card>
        <Eyebrow>{open ? s.eyebrow : g.eyebrow}</Eyebrow>
        <h1 className="mb-3 display text-[clamp(28px,6vw,40px)]">{open ? s.title : g.title}</h1>
        <p className="mb-[22px] max-w-[60ch] text-ink-2">{open ? s.sub : g.sub}</p>
        {open ? (
          <>
            {preview || !siteKey ? (
              <div className="grid gap-2.5">
                <Button type="button" disabled className="w-full sm:w-auto sm:justify-self-start">
                  {s.cta}
                  <Arrow />
                </Button>
                <p className="text-sm text-muted">{s.note}</p>
              </div>
            ) : (
              <StartForm siteKey={siteKey} />
            )}
            <details className="mt-6 border-t-2 border-rule pt-1">
              <summary className="flex min-h-11 items-center text-sm font-bold text-ink-2 hover:text-ink">
                {s.codeToggle}
              </summary>
              <CodeForm secondary />
            </details>
          </>
        ) : (
          <CodeForm />
        )}
      </Card>
    </LangProvider>
  );
}
