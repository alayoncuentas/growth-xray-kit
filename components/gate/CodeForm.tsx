"use client";

import { useActionState } from "react";
import { submitCode, type CodeFormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/config";

export function CodeForm() {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(submitCode, {});
  const g = copy.gate;
  const errors = { format: g.errorShort, unknown: g.errorUnknown, expired: g.errorExpired, rate: g.errorRate };
  const error: string | null = state.error ? errors[state.error] : null;

  return (
    <form action={action} noValidate className="mt-[22px] grid gap-1.5">
      <label htmlFor="code" className="text-[13px] font-semibold">
        {g.label}
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          maxLength={32}
          placeholder={g.placeholder}
          defaultValue={state.code ?? ""}
          aria-invalid={!!error}
          aria-describedby={error ? "code-err" : undefined}
          className="min-w-0 flex-1 rounded-card border-[1.5px] border-line bg-paper px-3.5 py-3 font-mono text-lg leading-none font-medium tracking-[0.08em] text-ink uppercase placeholder:text-muted placeholder:opacity-60"
        />
        <Button type="submit" disabled={pending}>
          {g.cta}
        </Button>
      </div>
      {error && (
        <p id="code-err" className="text-[13px] text-bad">
          {error}
        </p>
      )}
      <p className="text-[13px] text-muted">{g.resumeHint}</p>
    </form>
  );
}
