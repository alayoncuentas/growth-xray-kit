"use client";

import { useActionState } from "react";
import { requestLink, type LoginState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";

type Copy = Record<"label" | "cta" | "sent" | "errorEmail" | "errorSend", string>;

export function LoginForm({ t, initialError }: { t: Copy; initialError?: string | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestLink, {});
  const error = state.error === "email" ? t.errorEmail : state.error === "send" ? t.errorSend : !state.sent ? initialError : null;

  if (state.sent) {
    return (
      <p role="status" className="mt-[22px] rounded-card bg-accent-soft p-4">
        {t.sent.replace("{email}", state.sent)}
      </p>
    );
  }
  return (
    <form action={action} noValidate className="mt-[22px] grid gap-1.5">
      <label htmlFor="email" className="text-[13px] font-semibold">
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
          className="min-w-0 flex-1 rounded-card border-[1.5px] border-line bg-paper px-3.5 py-3 text-ink"
        />
        <Button type="submit" disabled={pending}>
          {t.cta}
        </Button>
      </div>
      {error && (
        <p id="email-err" className="text-[13px] text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
