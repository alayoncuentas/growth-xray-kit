import raw from "@/config/phase1.config.json";
import type { ChoiceQuestion, Phase1Config, Question } from "./types";

export const phase1 = raw as unknown as Phase1Config;
export const copy = phase1.copy;

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

export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
