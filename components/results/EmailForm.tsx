"use client";

import { useActionState } from "react";
import { captureEmail, type CaptureState } from "@/app/actions";
import { Arrow, Button } from "@/components/ui/Button";
import type { GiftKind } from "@/lib/gifts";
import { useConfig } from "@/lib/i18n";
import { ConsentNote } from "./ConsentNote";
import { ErrorText, inputClass, labelClass } from "@/components/ui/field";


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
        <label htmlFor="capture-email" className={labelClass}>
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
          <ErrorText id="capture-err" role="alert">
            {error}
          </ErrorText>
        )}
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:justify-self-start">
        {t.cta}
        <Arrow />
      </Button>
      <ConsentNote gift={gift} />
    </form>
  );
}
