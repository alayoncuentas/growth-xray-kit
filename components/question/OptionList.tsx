"use client";

import type { ChoiceQuestion } from "@/lib/types";

export function OptionList({
  question,
  value,
  onToggle,
}: {
  question: ChoiceQuestion;
  value: string | string[] | undefined;
  onToggle: (optionId: string) => void;
}) {
  const multi = question.type === "multi";
  const isSelected = (id: string) => (multi ? Array.isArray(value) && value.includes(id) : value === id);

  return (
    <div role="group" aria-label={question.prompt} className="mt-5 grid gap-2.5">
      {question.options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={isSelected(o.id)}
          onClick={() => onToggle(o.id)}
          className="group flex min-h-11 w-full cursor-pointer items-start gap-3 border-2 border-line bg-card px-4 py-3.5 text-left transition-colors duration-[140ms] ease-linear hover:border-rule hover:bg-highlight-soft aria-pressed:border-rule aria-pressed:bg-highlight aria-pressed:text-highlight-ink"
        >
          {/* Marcador cuadrado con estado explícito: ✓ en selección múltiple, cuadro lleno en selección única. */}
          <span
            aria-hidden
            className="mt-[3px] grid size-[18px] flex-none place-items-center border-2 border-ink-2 bg-card text-ink group-aria-pressed:border-highlight-ink"
          >
            <svg viewBox="0 0 12 12" width="12" height="12" focusable="false" className="hidden group-aria-pressed:block">
              {multi ? (
                <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
              ) : (
                <rect x="2" y="2" width="8" height="8" fill="currentColor" />
              )}
            </svg>
          </span>
          <span>
            <span className="font-semibold">{o.label}</span>
            {o.hint && <span className="block text-sm text-muted group-aria-pressed:text-highlight-ink">{o.hint}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
