"use client";

import { useActionState } from "react";
import { requestLink, type LoginState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { ErrorText, inputBase, labelClass } from "@/components/ui/field";

type Copy = Record<"label" | "cta" | "sent" | "errorEmail" | "errorSend", string>;

export function LoginForm({ t, initialError }: { t: Copy; initialError?: string | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestLink, {});
  const error = state.error === "email" ? t.errorEmail : state.error === "send" ? t.errorSend : !state.sent ? initialError : null;

  if (state.sent) {
    return (
      <p role="status" className="mt-[22px] border-2 border-l-[6px] border-line border-l-accent bg-card px-4 py-3">
        {t.sent.replace("{email}", state.sent)}
      </p>
    );
  }
  return (
    <form action={action} noValidate className="mt-[22px] grid gap-1.5">
      <label htmlFor="email" className={labelClass}>
        {t.label}
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          aria-invalid={!!error}
          aria-describedby={error ? "email-err" : undefined}
          className={`${inputBase} flex-1`}
        />
        <Button type="submit" disabled={pending}>
          {t.cta}
        </Button>
      </div>
      {error && (
        <ErrorText id="email-err">
          {error}
        </ErrorText>
      )}
    </form>
  );
}
