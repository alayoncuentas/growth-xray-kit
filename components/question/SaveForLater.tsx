"use client";

import { useActionState } from "react";
import { saveForLater, type SaveLaterState } from "@/app/actions";
import { buttonClass } from "@/components/ui/Button";
import { fill } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import { flushSaves } from "@/lib/sync";

/**
 * "Save and finish later": termina de guardar lo pendiente y envía por correo el link para retomar.
 * Si el código no tiene correo, lo pide. `tone="inverse"` es para el panel oscuro de la fase 2.
 */
export function SaveForLater({ code, tone = "default" }: { code: string; tone?: "default" | "inverse" }) {
  const t = useConfig().copy.later;
  const [state, action, pending] = useActionState<SaveLaterState, FormData>(async (prev, fd) => {
    await flushSaves(); // que el link lleve a la respuesta más reciente
    return saveForLater(code, prev, fd);
  }, { status: "idle" });
  const inverse = tone === "inverse";
  const muted = inverse ? "text-paper/75" : "text-muted";

  const message =
    state.status === "sent"
      ? fill(t.sent, { to: state.to })
      : state.status === "rate"
        ? t.errorRate
        : state.status === "error"
          ? fill(t.errorSend, { code })
          : state.status === "preview"
            ? t.preview
            : null;

  if (state.status === "needEmail") {
    const error = state.status === "needEmail" && state.error === "email";
    return (
      <form action={action} className="grid w-full gap-1.5">
        <label htmlFor="later-email" className="text-[13px] font-semibold">
          {t.askEmail}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="later-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={error}
            aria-describedby={error ? "later-err" : undefined}
            className="min-w-0 flex-1 rounded-card border-[1.5px] border-line bg-paper px-3 py-2.5 text-ink"
          />
          <button type="submit" disabled={pending} className={buttonClass(inverse ? "line" : "primary", inverse ? "border-paper/40! text-paper!" : "")}>
            {pending ? t.sending : t.submit}
          </button>
        </div>
        {error && (
          <p id="later-err" className={`text-[13px] ${inverse ? "text-paper" : "text-bad"}`}>
            {t.errorEmail}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="grid gap-1.5">
      {state.status !== "sent" && (
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className={
              inverse
                ? buttonClass("line", "border-paper/40! text-paper!")
                : `cursor-pointer text-sm underline underline-offset-2 disabled:opacity-50 ${muted} hover:text-ink`
            }
          >
            {pending ? t.sending : t.cta}
          </button>
        </form>
      )}
      <p role="status" className={`text-[13px] ${muted}`}>
        {message}
      </p>
    </div>
  );
}
