"use client";

// Cola de guardado hacia POST /api/answer. Envía en orden, una petición a la vez, y solo el último
// valor de cada pregunta (los sliders de la calculadora se agrupan con un retraso).
// Si falla la red o el servidor, conserva lo pendiente, avisa y reintenta en el próximo guardado.

import { setSaveFailed } from "./store";

type Value = string | string[] | Record<string, number>;

const pending = new Map<string, { code: string; questionId: string; value: Value }>();
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

/** Encola el valor de una pregunta. `delay` agrupa cambios seguidos (sliders). */
export function queueSave(code: string, questionId: string, value: Value, delay = 0) {
  pending.set(`${code}:${questionId}`, { code, questionId, value });
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

/** Cierra la fase: guarda la última respuesta con `complete` para que el servidor registre phase_done. */
export async function completePhase(code: string, questionId: string, value: Value): Promise<void> {
  pending.delete(`${code}:${questionId}`);
  await flushSaves();
  const r = await post({ code, questionId, value, complete: true });
  if (r === "retry") setSaveFailed(true);
}
