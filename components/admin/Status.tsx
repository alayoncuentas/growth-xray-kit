import "server-only";
import type { CodeStatus } from "@/lib/admin";
import { adminCopy } from "@/lib/server/team";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

// Siempre con texto: neutro → activo (naranja) → completado (turquesa) → fase 2 (contorno de tinta) → cita (tinta llena).
const tone: Record<CodeStatus, BadgeTone> = {
  sent: "neutral",
  opened: "highlight",
  p1_done: "new",
  p2_done: "strong",
  booked: "solid",
};

export function StatusBadge({ status, expired = false }: { status: CodeStatus; expired?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={tone[status]}>{adminCopy.statuses[status]}</Badge>
      {expired && <Badge tone="danger">{adminCopy.list.expired}</Badge>}
    </span>
  );
}

/** Fecha y hora cortas en UTC (el servidor y el equipo pueden estar en zonas distintas). */
export function when(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}
