// Vista previa del diagnóstico (/admin/preview y modo recorrido). Funciones puras: sirven en cliente y servidor.
// Los datos de ejemplo viven en config/preview.json.

import raw from "@/config/preview.json";
import { insightFor, type InsightView } from "./insights";
import { isChoice, type Lang } from "./config";
import type { Answers, ArchetypeId, CalcOverrides, Company, Phase1Config, Question } from "./types";

export type PreviewVariant = "outside" | "plain";

interface PreviewConfig {
  code: string;
  plainCode: string;
  company: Company;
  /** Vista externa de ejemplo en español. */
  outsideEs: NonNullable<Company["outside"]>;
  plainCompany: Company;
  samples: Record<ArchetypeId, { answers: Answers; calc: CalcOverrides }>;
}

export const preview = raw as unknown as PreviewConfig;

/** Orden en que se muestran los arquetipos. */
export const SAMPLE_IDS: ArchetypeId[] = ["ready", "leaky", "secret", "bottleneck", "silent"];

/** "PREVIEW" → con vista externa; "PREVIEW-PLAIN" → negocio sin vista externa ni rubro. Otro código → null. */
export function previewVariant(code: string): PreviewVariant | null {
  if (code === preview.code) return "outside";
  if (code === preview.plainCode) return "plain";
  return null;
}

/** Empresa de ejemplo de la vista previa; en español, con la vista externa de ejemplo en español. */
export function previewCompany(v: PreviewVariant, lang: Lang = "en"): Company {
  if (v !== "outside") return preview.plainCompany;
  return lang === "es" ? { ...preview.company, outside: preview.outsideEs } : preview.company;
}

export function isSampleId(s: unknown): s is ArchetypeId {
  return typeof s === "string" && (SAMPLE_IDS as string[]).includes(s);
}

export function sampleState(id: ArchetypeId): { answers: Answers; calc: CalcOverrides } {
  const s = preview.samples[id];
  return { answers: { ...s.answers }, calc: { ...s.calc } };
}

// ---------- variantes de insights ----------

/** Contextos que cambian el insight de una pregunta (la lógica está en lib/insights.ts). */
export type ContextId = "channels3" | "channels1" | "outside" | "noOutside" | "weak" | "strong";

const WEAK: Answers = { busy: "d", speed: "next", afterhours: "none", followup: "wait" };
const STRONG: Answers = { busy: "a", speed: "5m", afterhours: "book", followup: "auto" };

const CONTEXTS: Record<string, { id: ContextId; answers?: Answers; outside?: boolean }[]> = {
  tracking: [
    { id: "channels3", answers: { channels: ["phone", "form", "google"] } },
    { id: "channels1", answers: { channels: ["phone"] } },
  ],
  reviews: [{ id: "outside", outside: true }, { id: "noOutside" }],
  ads: [
    { id: "weak", answers: WEAK },
    { id: "strong", answers: STRONG },
  ],
};

export interface InsightCase {
  optionId: string;
  optionLabel: string;
  /** null cuando el insight no depende del contexto. */
  context: ContextId | null;
  view: InsightView | null;
  /** Opción única sin insight: la pantalla avanza sola. */
  autoAdvance: boolean;
}

/** Cada opción con el insight exacto que mostraría; si el contexto no cambia nada, una sola fila. */
export function insightCases(cfg: Phase1Config, q: Question, outsideLastReview: string): InsightCase[] {
  if (!isChoice(q)) return [];
  const contexts = CONTEXTS[q.id] ?? [];
  return q.options.flatMap((o): InsightCase[] => {
    const run = (c?: (typeof contexts)[number]) =>
      insightFor(cfg, q, { ...(c?.answers ?? {}), [q.id]: q.type === "multi" ? [o.id] : o.id }, c?.outside ? { lastReview: outsideLastReview } : null);
    const base = { optionId: o.id, optionLabel: o.label };
    const views = contexts.map((c) => ({ c, view: run(c) }));
    const distinct = new Set(views.map((v) => JSON.stringify(v.view)));
    if (!contexts.length || distinct.size === 1) {
      const view = contexts.length ? views[0].view : run();
      return [{ ...base, context: null, view, autoAdvance: q.type === "single" && !view }];
    }
    return views.map(({ c, view }) => ({ ...base, context: c.id, view, autoAdvance: q.type === "single" && !view }));
  });
}
