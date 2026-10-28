"use client";

import { useActionState } from "react";
import { createCompanyAction, type CompanyFormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "./fields";
import { ErrorText } from "@/components/ui/field";

// Textos del formulario: los pasa el servidor (config/team.config.json no debe llegar al bundle del cliente).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Copy = Record<string, any>;

const OUTSIDE = ["date", "text", "reply", "replyGap", "reviews", "lastReview"] as const;

export function CompanyForm({
  t,
  industries,
  expiryChoices,
  langs,
}: {
  t: Copy;
  industries: { id: string; label: string }[];
  expiryChoices: number[];
  langs: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<CompanyFormState, FormData>(createCompanyAction, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const input = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={name}
      name={name}
      defaultValue={v[name]}
      aria-invalid={!!e[name as keyof typeof e]}
      aria-describedby={e[name as keyof typeof e] ? `${name}-err` : undefined}
      className={inputClass}
      {...props}
    />
  );

  return (
    <form action={action} noValidate className="mt-[22px] grid gap-4">
      {Object.keys(e).length > 0 && (
        <ErrorText role="alert">
          {t.errorGeneric}
        </ErrorText>
      )}
      <Field name="name" label={t.name} error={e.name}>
        {input("name", { required: true, maxLength: 120, autoComplete: "organization" })}
      </Field>
      <div className="grid gap-4 min-[561px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field name="city" label={t.city}>
          {input("city", { autoComplete: "address-level2" })}
        </Field>
        <Field name="state" label={t.state} error={e.state}>
          {input("state", { maxLength: 2, placeholder: "TX", className: `${inputClass} uppercase` })}
        </Field>
      </div>
      <Field name="industry" label={t.industry} error={e.industry}>
        <select id="industry" name="industry" defaultValue={v.industry ?? ""} className={inputClass}>
          <option value="">{t.industryUnknown}</option>
          {industries.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field name="lang" label={t.lang}>
        <select id="lang" name="lang" defaultValue={v.lang ?? "en"} aria-describedby="lang-note" className={inputClass}>
          {langs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <p id="lang-note" className="text-sm text-muted">
          {t.langNote}
        </p>
      </Field>
      <div className="grid gap-4 min-[561px]:grid-cols-2">
        <Field name="website" label={t.website} error={e.website}>
          {input("website", { inputMode: "url", placeholder: "example.com" })}
        </Field>
        <Field name="phone" label={t.phone}>
          {input("phone", { type: "tel", autoComplete: "tel" })}
        </Field>
        <Field name="email" label={t.email} error={e.email}>
          {input("email", { type: "email", autoComplete: "email" })}
        </Field>
        <Field name="google_place_id" label={t.placeId}>
          {input("google_place_id", { className: `${inputClass} font-mono text-sm` })}
        </Field>
      </div>
      <Field name="expiresDays" label={t.expires} error={e.expiresDays}>
        <select id="expiresDays" name="expiresDays" defaultValue={v.expiresDays ?? "60"} className={inputClass}>
          {expiryChoices.map((n) => (
            <option key={n} value={n}>
              {t.expiresDays.replace("{n}", String(n))}
            </option>
          ))}
          <option value="never">{t.expiresNever}</option>
        </select>
      </Field>

      <fieldset className="grid gap-4 border-2 border-line px-[18px] py-4">
        <legend className="label-mono px-1 text-ink">{t.outsideTitle}</legend>
        <p className="-mt-1 text-sm text-muted">{t.outsideSub}</p>
        {e.outside && (
          <ErrorText id="outside-err">
            {e.outside}
          </ErrorText>
        )}
        <div className="grid gap-4 min-[561px]:grid-cols-2">
          {OUTSIDE.map((k) => (
            <Field key={k} name={`outside_${k}`} label={t.outside[k]}>
              {input(`outside_${k}`, { placeholder: t.outsidePlaceholders[k] })}
            </Field>
          ))}
        </div>
      </fieldset>

      <div>
        <Button type="submit" disabled={pending}>
          {t.cta}
        </Button>
      </div>
    </form>
  );
}
