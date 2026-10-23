import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Panel interno. TODO(supabase): proteger con Supabase Auth ANTES de mostrar cualquier dato.
// Aquí vivirá la vista del equipo (teamScores en lib/scoring.ts + textos de config/team.config.json).
// Por ahora no lee ni muestra datos de leads.
export default function AdminPage() {
  return (
    <Container wide>
      <Card>
        <Eyebrow>Internal</Eyebrow>
        <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">Team dashboard</h1>
        <p className="text-muted">Not connected yet. This page will require sign-in before it shows any lead data.</p>
      </Card>
    </Container>
  );
}
