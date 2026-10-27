"use client";

import { useActionState } from "react";
import { captureEmail, type CaptureState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import type { GiftKind } from "@/lib/gifts";
import { useConfig } from "@/lib/i18n";
import { ConsentNote } from "./ConsentNote";

const inputClass = "w-full min-w-0 rounded-card border-[1.5px] border-line bg-paper px-3.5 py-3 text-ink placeholder:text-muted placeholder:opacity-60";

/**
 * Correo antes del resultado completo: un campo, el botón y el consentimiento "By continuing…" (docs/OPEN_ENTRY.md §9).
 * Lo comparten la pantalla del correo y el bloque para desbloquear el parcial. Valida en el servidor.
 */
export function EmailForm({ code, from, gift }: { code: string; from: "screen" | "partial"; gift: GiftKind }) {
  const cfg = useConfig();
  const t = cfg.copy.capture;
  const [state, action, pending] = useActionState<CaptureState, FormData>(captureEmail.bind(null, code, from), {});
  const error = state.error === "email" ? t.errorEmail : state.error === "save" ? t.errorSave : null;

  return (
    <form action={action} noValidate className="grid gap-3">
      <div className="grid gap-1.5">
        <label htmlFor="capture-email" className="text-[13px] font-semibold">
          {t.emailLabel}
        </label>
        <input
          id="capture-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          placeholder={t.emailPlaceholder}
          defaultValue={state.email ?? ""}
          key={state.email ?? ""}
          aria-invalid={state.error === "email"}
          aria-describedby={error ? "capture-err" : undefined}
          className={inputClass}
        />
        {error && (
          <p id="capture-err" role="alert" className="text-[13px] text-bad">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {t.cta}
      </Button>
      <ConsentNote gift={gift} />
    </form>
  );
}
