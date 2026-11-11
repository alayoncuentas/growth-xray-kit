"use client";

// Cola de guardado hacia POST /api/answer. Envía en orden, una petición a la vez, y solo el último
// valor de cada pregunta (los sliders de la calculadora se agrupan con un retraso).
// Si falla la red o el servidor, conserva lo pendiente, avisa y reintenta en el próximo guardado.

import { setSaveFailed } from "./store";

type Value = string | string[] | Record<string, number>;
type Phase = 1 | 2;

const pending = new Map<string, { code: string; questionId: string; value: Value; phase?: 2 }>();
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;

async function post(body: object): Promise<"ok" | "retry" | "drop"> {
  try {
    const res = await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (res.ok) return "ok";
    // 4xx (salvo 429): la respuesta no es válida y reintentar no la arregla.
    return res.status === 429 || res.status >= 500 ? "retry" : "drop";
  } catch {
    return "retry";
  }
}

async function drain() {
  for (const [key, item] of pending) {
    pending.delete(key);
    const r = await post(item);
    if (r === "retry") {
      if (!pending.has(key)) pending.set(key, item); // si llegó un valor más nuevo, gana ese
      setSaveFailed(true);
      return;
    }
    if (r === "drop") console.warn("[sync] answer rejected", item.questionId);
  }
  setSaveFailed(false);
}

function run(): Promise<void> {
  running ??= drain().finally(() => {
    running = null;
  });
  return running;
}

/** Espera el envío en curso (si hay) y manda lo que se encoló mientras tanto. */
async function kick() {
  if (running) await running;
  if (pending.size) await run();
}

const key = (code: string, questionId: string, phase: Phase) => `${code}:${phase}:${questionId}`;

/** Encola el valor de una pregunta. `delay` agrupa cambios seguidos (sliders). La fase 1 no manda `phase`. */
export function queueSave(code: string, questionId: string, value: Value, delay = 0, phase: Phase = 1) {
  pending.set(key(code, questionId, phase), { code, questionId, value, ...(phase === 2 ? { phase } : {}) });
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    void kick();
  }, delay);
}

/** Envía todo lo pendiente ahora. Devuelve true si no quedó nada sin guardar. */
export async function flushSaves(): Promise<boolean> {
  clearTimeout(timer);
  timer = undefined;
  await kick();
  return pending.size === 0;
}

/**
 * Cierra la fase: guarda la última respuesta con `complete` para que el servidor registre phase_done. En la fase 2
 * el servidor solo la cierra si no queda ninguna pregunta visible sin responder.
 */
export async function completePhase(code: string, questionId: string, value: Value, phase: Phase = 1): Promise<void> {
  pending.delete(key(code, questionId, phase));
  await flushSaves();
  const r = await post({ code, questionId, value, complete: true, ...(phase === 2 ? { phase } : {}) });
  if (r === "retry") setSaveFailed(true);
}
