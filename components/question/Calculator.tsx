"use client";

import { MoneyAtStake } from "@/components/results/MoneyAtStake";
import { calcFieldText, phase1 } from "@/lib/config";
import { calcValues } from "@/lib/scoring";
import { getDiagnostic, setCalc, useDiagnostic } from "@/lib/store";
import { queueSave } from "@/lib/sync";
import type { CalculatorQuestion } from "@/lib/types";

// Los sliders cambian muchas veces por segundo: se guarda el último valor tras una pausa.
const SAVE_DELAY_MS = 600;

/** Sliders con el % que se escapa pre-calculado desde las respuestas; el dinero se recalcula en vivo. */
export function Calculator({ code, question }: { code: string; question: CalculatorQuestion }) {
  const { answers, calc: overrides } = useDiagnostic(code);
  const c = calcValues(phase1, answers, overrides);

  return (
    <>
      <div className="mt-5 grid gap-[18px] border-2 border-rule bg-card px-[18px] py-4">
        {question.fields.map((f) => (
          <div key={f.id} className="grid gap-1.5">
            <div className="flex justify-between gap-3 text-sm">
              <label htmlFor={`f_${f.id}`}>{f.label}</label>
              <output htmlFor={`f_${f.id}`} className="text-[15px] font-bold whitespace-nowrap text-link tabular-nums">
                {calcFieldText(question, f, c[f.id])}
              </output>
            </div>
            <input
              id={`f_${f.id}`}
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={c[f.id]}
              onChange={(e) => {
                setCalc(code, f.id, Number(e.target.value));
                queueSave(code, question.id, getDiagnostic(code).calc, SAVE_DELAY_MS);
              }}
              className="min-h-11 w-full accent-accent"
            />
            {f.note && <p className="-mt-1 text-sm text-muted">{f.note}</p>}
          </div>
        ))}
      </div>
      <div aria-live="polite">
        <MoneyAtStake calc={c} />
      </div>
      {question.disclaimer && <p className="mt-2.5 text-sm text-muted">{question.disclaimer}</p>}
    </>
  );
}
