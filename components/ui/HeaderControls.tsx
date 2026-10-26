"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLang } from "@/app/actions";
import { getConfig, LANGS, type Lang } from "@/lib/config";
import { getCurrentCode, setCurrentPage, useCurrentLang } from "@/lib/store";
import { Chip } from "./Chip";
import { PreparedFor } from "./PreparedFor";
import { ThemeToggle } from "./ThemeToggle";

/** Parte del encabezado que depende del idioma: "Phase 1", "Prepared for …", botón EN / ES y tema. */
export function HeaderControls({ cookieLang }: { cookieLang: Lang }) {
  const lang = useCurrentLang(cookieLang);
  const admin = usePathname().startsWith("/admin"); // el panel sigue en inglés y no muestra el botón
  const shown = admin ? "en" : lang;
  return (
    <>
      <Chip>{getConfig(shown).copy.phaseChip}</Chip>
      <span className="flex-1" />
      <PreparedFor lang={shown} />
      {!admin && <LangSwitch lang={lang} />}
      <ThemeToggle lang={shown} />
    </>
  );
}

/** EN / ES: guarda la elección (cookie y, con código, la sesión) y vuelve a pedir la pantalla en ese idioma. */
function LangSwitch({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const t = getConfig(lang).copy.lang;
  const choose = (next: Lang) => {
    if (next === lang || pending) return;
    const code = getCurrentCode();
    setCurrentPage({ lang: next, code }); // el encabezado cambia al instante; la pantalla, al volver del servidor
    start(async () => {
      await setLang(next, code);
      router.refresh();
    });
  };
  return (
    <div role="radiogroup" aria-label={t.label} className={`inline-flex rounded-full border border-line p-0.5 ${pending ? "opacity-60" : ""}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          aria-label={t.names[l]}
          lang={l}
          onClick={() => choose(l)}
          className={`label-mono cursor-pointer rounded-full px-2.5 py-1 text-[11px] leading-none ${lang === l ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
