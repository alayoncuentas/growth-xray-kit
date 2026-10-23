import { CodeForm } from "@/components/gate/CodeForm";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { copy } from "@/lib/config";

export default function GatePage() {
  const g = copy.gate;
  return (
    <Container>
      <Card>
        <Eyebrow>{g.eyebrow}</Eyebrow>
        <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{g.title}</h1>
        <p className="mb-[22px] text-muted">{g.sub}</p>
        <CodeForm />
      </Card>
    </Container>
  );
}
