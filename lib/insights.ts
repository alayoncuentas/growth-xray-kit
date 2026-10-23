// Qué insight mostrar después de cada respuesta. Función pura: devuelve datos, no JSX.
// Los textos viven en config/phase1.config.json (question.insight); aquí solo está la lógica del prototipo.

import { fill } from "./config";
import { adSpend, pillarScores } from "./scoring";
import type { Answers, Phase1Config, Question } from "./types";

export type InsightView =
  | { kind: "evidence"; evidence: string; lead?: string; extraLead?: string }
  | { kind: "mirror"; text: string }
  | { kind: "myth"; myth: string }
  | { kind: "leaky"; tag: string; lead: string; text: string; note?: string };

export interface OutsideFacts {
  lastReview: string;
}

export function insightFor(cfg: Phase1Config, q: Question, answers: Answers, outside?: OutsideFacts | null): InsightView | null {
  const a = answers[q.id];
  if (!a || (Array.isArray(a) && !a.length) || typeof a !== "string") return null;
  const ins = q.insight;
  if (!ins) return null;

  switch (q.id) {
    case "busy":
      return { kind: "evidence", evidence: ins.evidence!, lead: ins.leads?.[a] ?? ins.leads?.["*"] };

    case "speed":
      return { kind: "evidence", evidence: ins.evidence!, lead: ins.leads?.[a] };

    case "tracking": {
      const n = (answers.channels as string[] | undefined)?.length ?? 0;
      if (ins.when && n >= ins.when.minChannels && ins.when.options.includes(a) && ins.text) {
        return { kind: "mirror", text: fill(ins.text, { n }) };
      }
      return null;
    }

    case "followup":
      return ins.myth ? { kind: "myth", myth: ins.myth } : null;

    case "reviews": {
      const view: InsightView = { kind: "evidence", evidence: ins.evidence!, lead: ins.leads?.[a] ?? ins.leads?.["*"] };
      if (outside && a !== "process" && ins.outsideLead) view.extraLead = fill(ins.outsideLead, { lastReview: outside.lastReview });
      return view;
    }

    case "away":
      return { kind: "mirror", text: ins.texts?.[a] ?? ins.texts?.["*"] ?? "" };

    case "ads": {
      const spend = adSpend(cfg, answers);
      const ps = pillarScores(cfg, answers);
      const weak = (ps.access ?? 100) < 55 || (ps.followup ?? 100) < 55;
      const v = ins.variants ?? {};
      if (spend > 0 && weak && v.leaky) {
        return {
          kind: "leaky",
          tag: v.leaky.tag ?? "",
          lead: v.leaky.lead ?? "",
          text: v.leaky.text,
          note: v.leaky.myth ? cfg.myths[v.leaky.myth]?.reality : undefined,
        };
      }
      if (spend === 0 && weak && v.fixFirst) return { kind: "mirror", text: v.fixFirst.text };
      if (spend > 0 && v.solid) return { kind: "mirror", text: v.solid.text };
      return null;
    }
  }
  return null;
}
