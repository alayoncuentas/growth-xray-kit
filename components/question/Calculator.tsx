"use client";

import { useState } from "react";
import { MoneyAtStake } from "@/components/results/MoneyAtStake";
import { Badge } from "@/components/ui/Badge";
import { calcFieldText, phase1 } from "@/lib/config";
import { calcValues, type CalcResult } from "@/lib/scoring";
import { getDiagnostic, setCalc, useDiagnostic } from "@/lib/store";
import { queueSave } from "@/lib/sync";
import type { CalculatorField, CalculatorQuestion } from "@/lib/types";

// Los controles cambian muchas veces por segundo: se guarda el último valor tras una pausa.
const SAVE_DELAY_MS = 600;

/** Máximo real de un campo: las cantidades no pueden pasar de las consultas de la semana (ni de las atendidas). */
function maxOf(f: CalculatorField, c: CalcResult): number {
  if (f.maxFrom === "weekly") return c.weekly;
  if (f.maxFrom === "answered") return c.weekly - c.unanswered;
  return f.max;
}

/**
 * Cantidades de una semana normal con botones − / + (sin respuesta y sin seguimiento, sugeridas desde las respuestas
 * hasta que el dueño las mueve), y deslizadores para "de cada 10" y el valor del cliente. El dinero se recalcula en vivo.
 */
export function Calculator({ code, question }: { code: string; question: CalculatorQuestion }) {
  const { answers, calc: overrides } = useDiagnostic(code);
  const c = calcValues(phase1, answers, overrides);

  const change = (f: CalculatorField, value: number) => {
    setCalc(code, f.id, Math.min(maxOf(f, c), Math.max(f.min, value)));
    // Si bajan las consultas (o sube "sin respuesta"), una cantidad ya fijada puede quedar por encima de su máximo:
    // se guarda recortada, para que lo guardado sea lo mismo que se ve.
    const after = getDiagnostic(code).calc;
    const now = calcValues(phase1, answers, after);
    for (const id of ["unanswered", "noFollowup"] as const) {
      if (after[id] !== undefined && after[id] !== now[id]) setCalc(code, id, now[id]);
    }
    queueSave(code, question.id, getDiagnostic(code).calc, SAVE_DELAY_MS);
  };

  return (
    <>
      <div className="mt-5 grid gap-[18px] border-2 border-rule bg-card px-[18px] py-4">
        {question.fields.map((f) => {
          const suggested = f.default === "suggested" && c.suggested[f.id as keyof CalcResult["suggested"]];
          const noteId = f.note ? `n_${f.id}` : undefined;
          return (
            <div key={f.id} className="grid gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <label htmlFor={`f_${f.id}`}>
                  {f.label}
                  {suggested && (
                    <Badge tone="strong" className="ml-2 align-middle">
                      {question.ui.suggested}
                    </Badge>
                  )}
                </label>
                {f.unit !== "count" && (
                  <output htmlFor={`f_${f.id}`} className="text-[15px] font-bold whitespace-nowrap text-link tabular-nums">
                    {calcFieldText(question, f, c[f.id])}
                  </output>
                )}
              </div>
              {f.unit === "count" ? (
                <Stepper
                  id={`f_${f.id}`}
                  value={c[f.id]}
                  min={f.min}
                  max={maxOf(f, c)}
                  describedBy={noteId}
                  decrease={`${question.ui.decrease}: ${f.label}`}
                  increase={`${question.ui.increase}: ${f.label}`}
                  onChange={(v) => change(f, v)}
                />
              ) : (
                <input
                  id={`f_${f.id}`}
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={c[f.id]}
                  aria-describedby={noteId}
                  aria-valuetext={calcFieldText(question, f, c[f.id])}
                  onChange={(e) => change(f, Number(e.target.value))}
                  className="min-h-11 w-full accent-accent"
                />
              )}
              {f.note && (
                <p id={noteId} className="-mt-0.5 text-sm text-muted">
                  {f.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div aria-live="polite">
        <MoneyAtStake calc={c} />
      </div>
      {question.disclaimer && <p className="mt-2.5 text-sm text-muted">{question.disclaimer}</p>}
    </>
  );
}

const stepButton =
  "flex min-h-11 min-w-11 items-center justify-center border-2 border-rule bg-card text-xl font-bold text-ink hover:bg-card-2 disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-card";

/** Cantidad entera con − / +. Se puede escribir; lo escrito fuera de rango se recorta, y al salir se muestra el valor real. */
function Stepper({
  id,
  value,
  min,
  max,
  describedBy,
  decrease,
  increase,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  describedBy?: string;
  decrease: string;
  increase: string;
  onChange: (v: number) => void;
}) {
  // Texto mientras se escribe (puede quedar vacío un momento); null = mostrar el valor.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="flex">
      <button type="button" className={stepButton} aria-label={decrease} aria-controls={id} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft ?? String(value)}
        aria-describedby={describedBy}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isInteger(n)) onChange(n);
        }}
        onBlur={() => setDraft(null)}
        className="min-h-11 w-20 border-y-2 border-rule bg-card text-center text-base font-bold text-ink tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={stepButton} aria-label={increase} aria-controls={id} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
