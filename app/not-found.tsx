import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { copy } from "@/lib/config";

export default function NotFound() {
  return (
    <Container>
      <Card>
        <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{copy.notFound.title}</h1>
        <p className="mb-[22px] text-muted">{copy.notFound.sub}</p>
        <ButtonLink href="/">{copy.notFound.cta}</ButtonLink>
      </Card>
    </Container>
  );
}
