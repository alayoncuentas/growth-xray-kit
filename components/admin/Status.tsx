import "server-only";
import type { CodeStatus } from "@/lib/admin";
import { adminCopy } from "@/lib/server/team";

const tone: Record<CodeStatus, string> = {
  sent: "border-line text-muted",
  opened: "border-warn text-warn",
  p1_done: "border-accent text-accent",
  p2_done: "border-good text-good",
  booked: "border-good bg-good text-paper",
};

export function StatusBadge({ status, expired = false }: { status: CodeStatus; expired?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`label-mono rounded-full border px-2 py-1 text-[11px] leading-none ${tone[status]}`}>{adminCopy.statuses[status]}</span>
      {expired && <span className="label-mono text-[11px] text-bad">{adminCopy.list.expired}</span>}
    </span>
  );
}

/** Fecha y hora cortas en UTC (el servidor y el equipo pueden estar en zonas distintas). */
export function when(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}
