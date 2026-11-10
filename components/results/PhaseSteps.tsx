"use client";

import { useConfig } from "@/lib/i18n";

/**
 * Etapas del diagnóstico: Phase 1 (terminada) → Phase 2 (la siguiente) → Full report. Horizontal también en el teléfono
 * (3 columnas de ~94 px a 320). `inverse`: sobre el bloque de tinta de la fase 2; `card`: sobre una tarjeta (/r/[code]).
 * El texto solo usa la tinta del fondo o su versión al 75 % (contraste AA). El paso actual: relleno naranja con número en
 * negro y borde de la tinta del bloque, para que el círculo contraste con el fondo en los dos temas (el naranja solo no
 * llega a 3:1 sobre el fondo claro del tema oscuro).
 */
export function PhaseSteps({ tone = "inverse" }: { tone?: "inverse" | "card" }) {
  const s = useConfig().copy.unlock.steps;
  const inv = tone === "inverse";
  const c = inv
    ? { fill: "bg-paper text-ink border-paper", text: "text-paper", soft: "text-paper/75", ring: "border-paper/75 text-paper", line: "border-paper" }
    : { fill: "bg-ink text-paper border-ink", text: "text-ink", soft: "text-ink-2", ring: "border-rule text-ink", line: "border-rule" };
  const steps = [
    { id: "p1", name: s.p1, status: s.done, mark: "✓", dot: c.fill },
    { id: "p2", name: s.p2, status: s.next, mark: "2", dot: `bg-highlight text-highlight-ink ${c.line}`, current: true },
    { id: "report", name: s.report, status: null, mark: "3", dot: c.ring },
  ];
  return (
    <ol aria-label={s.label} className="grid grid-cols-3">
      {steps.map((st, i) => (
        <li key={st.id} aria-current={st.current ? "step" : undefined} className="relative grid content-start gap-1.5 pr-2">
          {/* Conector hasta el paso siguiente: lleno después de la etapa terminada, punteado después de la actual. */}
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={`absolute top-[13px] right-0 left-8 border-t-2 ${c.line} ${i === 0 ? "border-solid" : "border-dashed"}`}
            />
          )}
          <span
            aria-hidden="true"
            className={`relative flex size-7 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums ${st.dot}`}
          >
            {st.mark}
          </span>
          <span className={`text-sm leading-tight font-bold ${c.text}`}>{st.name}</span>
          {st.status && <span className={`text-[13px] leading-tight ${c.soft}`}>{st.status}</span>}
        </li>
      ))}
    </ol>
  );
}
