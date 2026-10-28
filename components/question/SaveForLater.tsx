"use client";

import { useActionState } from "react";
import { saveForLater, type SaveLaterState } from "@/app/actions";
import { ConsentNote } from "@/components/results/ConsentNote";
import { buttonClass } from "@/components/ui/Button";
import { fill } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import { flushSaves } from "@/lib/sync";
import { ErrorText, inputBase, labelClass } from "@/components/ui/field";

// Botón secundario sobre el bloque de tinta (UnlockPanel): borde y texto claros; hover: relleno claro.
const INVERSE_LINE = "border-paper! text-paper! hover:bg-paper! hover:text-ink!";

/**
 * "Save and finish later": termina de guardar lo pendiente y envía por correo el link para retomar.
 * Si el código no tiene correo, lo pide. `tone="inverse"` es para el panel oscuro de la fase 2.
 */
export function SaveForLater({ code, tone = "default", open = false }: { code: string; tone?: "default" | "inverse"; open?: boolean }) {
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
          ? open
            ? t.errorSendOpen // camino abierto: el código nunca se muestra
            : fill(t.errorSend, { code })
          : state.status === "preview"
            ? t.preview
            : null;

  if (state.status === "needEmail") {
    const error = state.status === "needEmail" && state.error === "email";
    return (
      <form action={action} className="grid w-full gap-1.5">
        <label htmlFor="later-email" className={inverse ? "label-mono text-paper" : labelClass}>
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
            className={`${inputBase} flex-1`}
          />
          <button type="submit" disabled={pending} className={buttonClass(inverse ? "line" : "primary", inverse ? INVERSE_LINE : "")}>
            {pending ? t.sending : t.submit}
          </button>
        </div>
        {error && (
          <ErrorText id="later-err" className={inverse ? "text-paper!" : ""}>
            {t.errorEmail}
          </ErrorText>
        )}
        <ConsentNote gift={state.gift} inverse={inverse} />
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
                ? buttonClass("line", INVERSE_LINE)
                : `min-h-11 cursor-pointer text-sm underline underline-offset-4 disabled:opacity-50 ${muted} hover:text-ink`
            }
          >
            {pending ? t.sending : t.cta}
          </button>
        </form>
      )}
      <p role="status" className={`text-sm ${muted}`}>
        {message}
      </p>
    </div>
  );
}
