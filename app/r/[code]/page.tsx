import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { copy } from "@/lib/config";

// Informe compartible de solo lectura. TODO(supabase): cargar puntajes guardados por código.
// Nunca mostrar aquí Need / Potential / Readiness ni alertas: eso es solo de /admin.
export default function SharedReportPage() {
  const t = copy.report;
  return (
    <Container wide>
      <Card>
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{t.title}</h1>
        <p className="text-muted">{t.sub}</p>
      </Card>
    </Container>
  );
}
