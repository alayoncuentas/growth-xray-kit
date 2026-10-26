import en from "@/config/phase1.config.json";
import es from "@/config/phase1.config.es.json";
import type { ChoiceQuestion, Phase1Config, Question } from "./types";

// Idiomas de la interfaz pública. Los dos configs tienen la misma estructura (ids, opciones, puntajes):
// solo cambian los textos (lo verifica lib/config.test.ts). El panel /admin sigue en inglés.
export const LANGS = ["en", "es"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

export const isLang = (v: unknown): v is Lang => v === "en" || v === "es";

const configs: Record<Lang, Phase1Config> = {
  en: en as unknown as Phase1Config,
  es: es as unknown as Phase1Config,
};

/** Config con los textos del idioma. La lógica (puntajes, flujo, validación) da lo mismo con cualquiera. */
export function getConfig(lang: Lang = DEFAULT_LANG): Phase1Config {
  return configs[lang] ?? configs.en;
}

/** Config de referencia para la lógica que no muestra textos, y textos del panel (en inglés). */
export const phase1 = configs.en;

export function getQuestion(id: string, cfg: Phase1Config = phase1): Question | undefined {
  return cfg.questions.find((q) => q.id === id);
}

export function isChoice(q: Question): q is ChoiceQuestion {
  return q.type === "single" || q.type === "multi";
}

/** Reemplaza {clave} en un texto del config. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

// Montos en dólares con el formato de EE. UU. en los dos idiomas ($1,500): el público vive allí.
export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/** Cookie con el idioma elegido con el botón EN / ES (también la leen los marcos de /admin/preview). */
export const LANG_COOKIE = "gxr-lang";
