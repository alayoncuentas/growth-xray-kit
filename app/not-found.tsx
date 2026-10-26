import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { LoadingCard } from "@/components/ui/Loading";
import { getConfig } from "@/lib/config";
import { browserLang } from "@/lib/server/access";

export default function NotFound() {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        <Body />
      </Suspense>
    </Container>
  );
}

async function Body() {
  const t = getConfig(await browserLang()).copy.notFound;
  return (
    <Card>
      <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{t.title}</h1>
      <p className="mb-[22px] text-muted">{t.sub}</p>
      <ButtonLink href="/">{t.cta}</ButtonLink>
    </Card>
  );
}
