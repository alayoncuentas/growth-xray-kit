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
          className="group flex w-full cursor-pointer items-start gap-3 rounded-card border-[1.5px] border-line bg-card px-4 py-3.5 text-left transition-colors hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft"
        >
          <span
            aria-hidden
            className={`mt-[3px] size-[18px] flex-none border-[1.5px] border-muted group-aria-pressed:border-accent group-aria-pressed:bg-accent group-aria-pressed:shadow-[inset_0_0_0_3px_var(--card)] ${multi ? "rounded-sm" : "rounded-full"}`}
          />
          <span>
            <span className="font-medium">{o.label}</span>
            {o.hint && <span className="block text-[13px] text-muted">{o.hint}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
