import "server-only";
import { redirect } from "next/navigation";
import { phase1 } from "@/lib/config";
import { canEnterPhase2, type Phase2Gate } from "@/lib/phase2";
import { isSampleId, sampleState, type SampleId } from "@/lib/preview";
import { phase1Result, type CalcResult, type Situation } from "@/lib/scoring";
import type { Answers, CalcOverrides, PillarScores } from "@/lib/types";
import type { Access } from "./access";
import { loadPhase1, loadPhase2 } from "./diagnostic";

// Lo que necesitan las pantallas de la fase 2 (docs/SPEC.md §4): la entrada, lo de la fase 1 que leen la visibilidad y
// los mini-hallazgos, y las respuestas guardadas de la fase 2. Nunca incluye la vista del equipo.

/** De la fase 1, solo lo que muestran o usan las pantallas de la fase 2 (lo mismo que ya ve el prospecto). */
export interface Phase1Facts {
  answers: Answers;
  calc: CalcResult;
  pillars: PillarScores;
  situation: Situation;
}

export interface Phase2PageData {
  gate: Phase2Gate;
  p1: Phase1Facts;
  p2: Answers;
  p2Done: boolean;
  /** Vista previa: la muestra de la fase 1 viaja en los enlaces (?sample=…). Si no, vacío. */
  query: string;
}

/** Muestra de la fase 1 que usa la vista previa si no se elige otra. */
const PREVIEW_SAMPLE: SampleId = "leaky";

function facts(answers: Answers, overrides: CalcOverrides): Phase1Facts {
  const r = phase1Result(phase1, answers, overrides);
  return { answers, calc: r.calc, pillars: r.pillars, situation: r.situation };
}

/** La vista previa no lee la base: fase 1 de una muestra y fase 2 vacía (lo que se responda vive en el navegador). */
export async function phase2PageData(access: Access, sample: unknown): Promise<Phase2PageData> {
  if (access.preview) {
    const id = isSampleId(sample) ? sample : PREVIEW_SAMPLE;
    const s = sampleState(id);
    return { gate: "ok", p1: facts(s.answers, s.calc), p2: {}, p2Done: false, query: `?sample=${id}` };
  }
  const [saved1, saved2] = await Promise.all([loadPhase1(access.code), loadPhase2(access.code)]);
  return {
    gate: canEnterPhase2({ email: access.email, phase1Done: saved1.completed }),
    p1: facts(saved1.answers, saved1.calc),
    p2: saved2.answers,
    p2Done: saved2.completed,
    query: "",
  };
}

/** Sin correo, a la pantalla del correo (que vuelve a la fase 2); sin la fase 1 terminada, a la bienvenida (retoma). */
export function enforceGate(code: string, gate: Phase2Gate) {
  const base = `/x/${encodeURIComponent(code)}`;
  if (gate === "email") redirect(`${base}/email?next=phase-2`);
  if (gate === "phase1") redirect(base);
}
