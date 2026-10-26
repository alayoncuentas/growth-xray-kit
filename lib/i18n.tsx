"use client";

// Idioma de la interfaz pública en el cliente. Cada pantalla lo recibe del servidor (cookie, sesión o código;
// ver lib/server/access.ts) y lo entrega con <LangProvider>; los componentes leen sus textos con useConfig().

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { DEFAULT_LANG, getConfig, type Lang } from "./config";
import { setCurrentPage } from "./store";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Entrega el idioma a la pantalla y se lo anuncia al encabezado (que vive en el layout) y a <html lang>. */
export function LangProvider({ lang, code = null, children }: { lang: Lang; code?: string | null; children: ReactNode }) {
  useEffect(() => {
    setCurrentPage({ lang, code });
    document.documentElement.lang = lang;
    return () => setCurrentPage(null);
  }, [lang, code]);
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useConfig = () => getConfig(useContext(LangContext));

/** Solo el contexto, sin anunciar el idioma al encabezado: para mostrar pantallas en otro idioma dentro de /admin. */
export function LangScope({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}
