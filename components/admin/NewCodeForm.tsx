"use client";

import { useActionState } from "react";
import { newCodeAction, type NewCodeState } from "@/app/admin/actions";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "./fields";
import { ErrorText, labelClass } from "@/components/ui/field";

type Copy = { newCode: string; newCodeEmail: string; expiresDays: string; expiresNever: string; errorEmail: string };

/** Genera otro código para la misma empresa (otro contacto, o el anterior venció). */
export function NewCodeForm({ fromCode, t, expiryChoices }: { fromCode: string; t: Copy; expiryChoices: number[] }) {
  const [state, action, pending] = useActionState<NewCodeState, FormData>(newCodeAction.bind(null, fromCode), {});
  return (
    <form action={action} className="grid gap-2.5">
      <label htmlFor="nc-email" className={labelClass}>
        {t.newCodeEmail}
      </label>
      <input id="nc-email" name="email" type="email" className={inputClass} />
      <select name="expiresDays" defaultValue="60" aria-label="Expiry" className={inputClass}>
        {expiryChoices.map((n) => (
          <option key={n} value={n}>
            {t.expiresDays.replace("{n}", String(n))}
          </option>
        ))}
        <option value="never">{t.expiresNever}</option>
      </select>
      {state.error && <ErrorText>{t.errorEmail}</ErrorText>}
      <button type="submit" disabled={pending} className={buttonClass("line", "justify-self-start")}>
        {t.newCode}
      </button>
    </form>
  );
}
