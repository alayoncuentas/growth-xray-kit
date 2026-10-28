"use client";

import { useActionState } from "react";
import { saveBusiness, type BusinessState } from "@/app/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { MAX_BUSINESS_NAME } from "@/lib/open-entry";
import { useConfig } from "@/lib/i18n";
import { ErrorText, inputClass, labelClass } from "@/components/ui/field";


/** Datos del negocio (camino abierto): nombre obligatorio y web opcional. Valida en el servidor. */
export function BusinessForm({ code, backHref, initial }: { code: string; backHref: string; initial: { name: string; website: string } }) {
  const { business: t, question: q } = useConfig().copy;
  const [state, action, pending] = useActionState<BusinessState, FormData>(saveBusiness.bind(null, code), {});
  const values = state.values ?? initial;
  const nameErr = !!state.errors?.name;
  const webErr = !!state.errors?.website;

  return (
    <form action={action} noValidate className="mt-[22px] grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="name" className={labelClass}>
          {t.nameLabel}
        </label>
        <input
          id="name"
          name="name"
          autoComplete="organization"
          autoFocus
          required
          maxLength={MAX_BUSINESS_NAME}
          placeholder={t.namePlaceholder}
          defaultValue={values.name}
          key={`n-${values.name}`}
          aria-invalid={nameErr}
          aria-describedby={nameErr ? "name-err" : undefined}
          className={inputClass}
        />
        {nameErr && (
          <ErrorText id="name-err">
            {t.errorName}
          </ErrorText>
        )}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="website" className={labelClass}>
          {t.websiteLabel}
        </label>
        <input
          id="website"
          name="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={200}
          placeholder={t.websitePlaceholder}
          defaultValue={values.website}
          key={`w-${values.website}`}
          aria-invalid={webErr}
          aria-describedby={webErr ? "website-err" : undefined}
          className={inputClass}
        />
        {webErr && (
          <ErrorText id="website-err">
            {t.errorWebsite}
          </ErrorText>
        )}
      </div>
      {state.error === "save" && (
        <ErrorText role="alert">
          {t.errorSave}
        </ErrorText>
      )}
      <div className="mt-1 flex items-center justify-between gap-2.5">
        <ButtonLink href={backHref} variant="ghost">
          {q.back}
        </ButtonLink>
        <Button type="submit" disabled={pending}>
          {t.cta}
        </Button>
      </div>
    </form>
  );
}
