"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLang } from "@/app/actions";
import { LANGS, type Lang } from "@/lib/config";

/**
 * EN / ES de la vista previa: cambia la cookie de idioma de este navegador (la leen los marcos, que son las rutas reales)
 * y vuelve a pedir el mapa. Los códigos de vista previa no tienen sesión: no se guarda nada en la base.
 */
export function PreviewLangSwitch({ lang, label, names }: { lang: Lang; label: string; names: Record<Lang, string> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-full border border-line p-0.5 ${pending ? "opacity-60" : ""}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() =>
            l !== lang &&
            start(async () => {
              await setLang(l, null);
              router.refresh();
            })
          }
          className={`label-mono cursor-pointer rounded-full px-3 py-1.5 text-[11px] leading-none ${lang === l ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {names[l]}
        </button>
      ))}
    </div>
  );
}
