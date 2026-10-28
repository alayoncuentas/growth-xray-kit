"use client";

import { useActionState, useState } from "react";
import { deleteLeadAction, type DeleteLeadState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { confirmMatches } from "@/lib/admin";
import { ErrorText, inputBase } from "@/components/ui/field";

/** "Delete lead": hay que escribir el nombre del negocio (o el código) para habilitar el botón. Lo valida el servidor. */
export function DeleteLead({
  code,
  expected,
  t,
}: {
  code: string;
  /** Lo que hay que escribir: nombre del negocio o, si no tiene, el código. */
  expected: string;
  t: { label: string; button: string; mismatch: string; crm: string; failed: string };
}) {
  const [state, action, pending] = useActionState<DeleteLeadState, FormData>(deleteLeadAction.bind(null, code), {});
  const [typed, setTyped] = useState("");
  const error =
    state.error === "mismatch" || state.error === "notFound" ? t.mismatch : state.error === "crm" ? t.crm : state.error === "failed" ? t.failed : null;
  return (
    <form action={action} className="grid gap-2.5">
      <label htmlFor="delete-confirm" className="text-sm">
        {t.label.split("{name}")[0]}
        <b className="font-mono">{expected}</b>
        {t.label.split("{name}")[1]}
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="delete-confirm"
          name="confirm"
          autoComplete="off"
          spellCheck={false}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-describedby={error ? "delete-err" : undefined}
          className={`${inputBase} flex-1`}
        />
        <Button type="submit" variant="danger" disabled={pending || !confirmMatches(typed, expected)}>
          {t.button}
        </Button>
      </div>
      {error && (
        <ErrorText id="delete-err" role="alert">
          {error}
        </ErrorText>
      )}
    </form>
  );
}
