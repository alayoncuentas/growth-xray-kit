import { Suspense } from "react";
import { CodeForm } from "@/components/gate/CodeForm";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { DEFAULT_LANG, getConfig } from "@/lib/config";
import { LangProvider } from "@/lib/i18n";
import { cookieLang } from "@/lib/server/access";

export default function GatePage() {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        <Gate />
      </Suspense>
    </Container>
  );
}

// Sin código todavía no hay idioma de sesión: el de este navegador (botón EN / ES), o inglés.
async function Gate() {
  const lang = (await cookieLang()) ?? DEFAULT_LANG;
  const g = getConfig(lang).copy.gate;
  return (
    <LangProvider lang={lang}>
      <Card>
        <Eyebrow>{g.eyebrow}</Eyebrow>
        <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{g.title}</h1>
        <p className="mb-[22px] text-muted">{g.sub}</p>
        <CodeForm />
      </Card>
    </LangProvider>
  );
}
