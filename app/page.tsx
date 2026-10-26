import { Suspense } from "react";
import { CodeForm } from "@/components/gate/CodeForm";
import { StartForm } from "@/components/gate/StartForm";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { getConfig } from "@/lib/config";
import { LangProvider } from "@/lib/i18n";
import { browserLang } from "@/lib/server/access";
import { openEntryEnabled } from "@/lib/server/open-entry";

export default function GatePage() {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        <Gate />
      </Suspense>
    </Container>
  );
}

// Sin código todavía no hay idioma de sesión: el elegido con el botón EN / ES, si no el del navegador, si no inglés.
async function Gate() {
  const lang = await browserLang();
  const { gate: g, start: s } = getConfig(lang).copy;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  // Camino abierto (OPEN_ENTRY_ENABLED): "Start my X-Ray" primero y el código como opción secundaria.
  // Apagado (o sin clave de Turnstile), el inicio es solo el ingreso con código, como siempre.
  const open = openEntryEnabled() && !!siteKey;
  return (
    <LangProvider lang={lang}>
      <Card>
        <Eyebrow>{open ? s.eyebrow : g.eyebrow}</Eyebrow>
        <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{open ? s.title : g.title}</h1>
        <p className="mb-[22px] text-muted">{open ? s.sub : g.sub}</p>
        {open ? (
          <>
            <StartForm siteKey={siteKey} />
            <details className="group mt-6 border-t border-line pt-4">
              <summary className="cursor-pointer text-[14px] font-semibold text-muted marker:text-muted hover:text-ink">
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
