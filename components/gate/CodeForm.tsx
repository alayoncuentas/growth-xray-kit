"use client";

import { useActionState } from "react";
import { submitCode, type CodeFormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { useConfig } from "@/lib/i18n";
import { ErrorText, inputBase, labelClass } from "@/components/ui/field";

/** Ingreso con código. En el inicio abierto va como opción secundaria: sin foco automático y con "Continue". */
export function CodeForm({ secondary = false }: { secondary?: boolean }) {
  const [state, action, pending] = useActionState<CodeFormState, FormData>(submitCode, {});
  const { gate: g, start } = useConfig().copy;
  const errors = { format: g.errorShort, unknown: g.errorUnknown, expired: g.errorExpired, rate: g.errorRate };
  const error: string | null = state.error ? errors[state.error] : null;

  return (
    <form action={action} noValidate className={`${secondary ? "mt-3" : "mt-[22px]"} grid gap-1.5`}>
      <label htmlFor="code" className={labelClass}>
        {g.label}
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus={!secondary}
          maxLength={32}
          placeholder={g.placeholder}
          defaultValue={state.code ?? ""}
          aria-invalid={!!error}
          aria-describedby={error ? "code-err" : undefined}
          className={`${inputBase} flex-1 text-lg leading-none font-semibold tracking-[0.08em] uppercase tabular-nums`}
        />
        <Button type="submit" disabled={pending}>
          {secondary ? start.codeCta : g.cta}
        </Button>
      </div>
      {error && (
        <ErrorText id="code-err">
          {error}
        </ErrorText>
      )}
      <p className="text-sm text-muted">{g.resumeHint}</p>
    </form>
  );
}
