// Tipos del motor de diagnóstico. Reflejan la forma de config/phase1.config.json.

export type PillarId =
  | "access"
  | "pipeline"
  | "followup"
  | "reputation"
  | "owner"
  | "retention"
  | "visibility"
  | "readiness";

export type Phase1PillarId = "access" | "pipeline" | "followup" | "reputation" | "owner";

export interface Pillar {
  id: PillarId;
  label: string;
  phase: 1 | 2;
}

export interface Section {
  id: string;
  label: string;
}

export interface Evidence {
  text: string;
  source: string;
  kind: string;
  url: string;
}

export interface Myth {
  myth: string;
  reality: string;
  evidence?: string[];
  note?: string;
}

export interface Option {
  id: string;
  label: string;
  hint?: string;
  value?: number;
  scores?: Partial<Record<PillarId, number>>;
  flag?: string;
}

export interface Insight {
  kind: "evidence" | "myth" | "mirror";
  evidence?: string;
  myth?: string;
  id?: string;
  leads?: Record<string, string>;
  texts?: Record<string, string>;
  text?: string;
  outsideLead?: string;
  when?: { minChannels: number; options: string[] };
  variants?: Record<string, { tag?: string; lead?: string; text: string; myth?: string }>;
}

export interface CalculatorField {
  id: "inquiries" | "value" | "leak" | "close";
  label: string;
  unit?: "USD" | "%";
  min: number;
  max: number;
  step: number;
  default: number | "fromAnswers";
  note?: string;
}

interface BaseQuestion {
  id: string;
  section: string;
  prompt: string;
  sub?: string;
  insight?: Insight;
}

export interface ChoiceQuestion extends BaseQuestion {
  type: "single" | "multi";
  options: Option[];
}

export interface CalculatorQuestion extends BaseQuestion {
  type: "calculator";
  fields: CalculatorField[];
  prefillNote?: string;
  disclaimer?: string;
}

export type Question = ChoiceQuestion | CalculatorQuestion;

export type ArchetypeId = "ready" | "leaky" | "secret" | "bottleneck" | "silent";

export interface Archetype {
  name: string;
  line: string;
}

export interface Finding {
  title: string;
  step: string;
}

export type NotYetId = "platform" | "adBudget" | "moreAds" | "customApp";
export type IndexBand = "solid" | "gaps" | "leaks";

export interface Phase1Config {
  version: string;
  phase: number;
  title: string;
  estimatedMinutes: number;
  pillars: Pillar[];
  sections: Section[];
  evidence: Record<string, Evidence>;
  myths: Record<string, Myth>;
  questions: Question[];
  archetypes: Record<ArchetypeId, Archetype>;
  findings: Record<Phase1PillarId, Finding>;
  notYet: Record<NotYetId, string>;
  indexBands: Record<IndexBand, string>;
  // Textos de pantallas; se tipan de forma laxa porque solo se renderizan.
  copy: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Respuestas: id de opción (single), lista de ids (multi). */
export type Answers = Record<string, string | string[] | undefined>;

/** Valores que el usuario movió en la calculadora. */
export type CalcOverrides = Partial<Record<CalculatorField["id"], number>>;

export type PillarScores = Partial<Record<PillarId, number>>;

/** Datos del negocio asociados a un código. Visibles para el dueño del código; nunca puntajes internos. */
export interface OutsideView {
  date: string;
  text: string;
  reply: string;
  replyGap: string;
  reviews: string;
  lastReview: string;
}

export interface Company {
  business: string;
  city: string;
  industry?: string;
  outside?: OutsideView;
}
