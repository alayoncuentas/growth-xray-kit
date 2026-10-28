"use client";

// Estado del diagnóstico en el navegador, por código de acceso.
// Se siembra con lo guardado en Supabase (DiagnosticProvider) y cada cambio se envía a /api/answer (lib/sync.ts).

import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Lang } from "./config";
import type { Answers, CalcOverrides } from "./types";

export interface DiagnosticState {
  answers: Answers;
  calc: CalcOverrides;
}

const EMPTY: DiagnosticState = { answers: {}, calc: {} };
const states = new Map<string, DiagnosticState>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Lectura directa (fuera de render), p. ej. en manejadores de eventos. */
export function getDiagnostic(code: string): DiagnosticState {
  return states.get(code) ?? EMPTY;
}

export function setAnswer(code: string, qid: string, value: string | string[]) {
  const s = getDiagnostic(code);
  states.set(code, { ...s, answers: { ...s.answers, [qid]: value } });
  emit();
}

export function setCalc(code: string, field: keyof CalcOverrides, value: number) {
  const s = getDiagnostic(code);
  states.set(code, { ...s, calc: { ...s.calc, [field]: value } });
  emit();
}

/** Reemplaza todo el estado del código (modo recorrido de la vista previa: cargar una muestra o empezar de cero). */
export function replaceDiagnostic(code: string, state: DiagnosticState) {
  states.set(code, { answers: { ...state.answers }, calc: { ...state.calc } });
  emit();
}

// ---------- estado guardado en el servidor ----------

const Initial = createContext<{ code: string; state: DiagnosticState } | null>(null);

/**
 * Entrega lo guardado en Supabase. En el navegador siembra el store la primera vez que aparece el código
 * (p. ej. después de recargar); si ya hay estado en memoria, ese es más nuevo y se conserva.
 * En el servidor no toca el store (es compartido entre peticiones): solo lo usa como snapshot.
 */
export function DiagnosticProvider({ code, initial, children }: { code: string; initial: DiagnosticState; children: ReactNode }) {
  if (typeof window !== "undefined" && !states.has(code)) states.set(code, initial);
  return createElement(Initial, { value: { code, state: initial } }, children);
}

/** Estado del código. En el servidor y durante la hidratación devuelve lo guardado. */
export function useDiagnostic(code: string): DiagnosticState {
  const init = useContext(Initial);
  return useSyncExternalStore(
    subscribe,
    () => getDiagnostic(code),
    () => (init?.code === code ? init.state : EMPTY),
  );
}

// ---------- estado del guardado (para avisar si falla) ----------

let saveFailed = false;

export function setSaveFailed(v: boolean) {
  if (saveFailed === v) return;
  saveFailed = v;
  emit();
}

export function useSaveFailed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => saveFailed,
    () => false,
  );
}

// ---------- negocio actual (para "Prepared for …" en el encabezado) ----------

let currentBusiness: string | null = null;

export function setCurrentBusiness(name: string | null) {
  if (currentBusiness === name) return;
  currentBusiness = name;
  emit();
}

export function useCurrentBusiness(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => currentBusiness,
    () => null,
  );
}

// ---------- idioma de la pantalla actual (para el encabezado: botón EN / ES, "Phase 1", tema) ----------

let currentPage: { lang: Lang; code: string | null } | null = null;

export function setCurrentPage(page: { lang: Lang; code: string | null } | null) {
  if (currentPage?.lang === page?.lang && currentPage?.code === page?.code) return;
  currentPage = page;
  emit();
}

/**
 * Idioma de la pantalla; hasta que la pantalla lo anuncia (después de montar), el que resolvió el servidor.
 * En la hidratación siempre devuelve `fallback`, igual que el HTML del servidor.
 */
export function useCurrentLang(fallback: Lang): Lang {
  return useSyncExternalStore(
    subscribe,
    () => currentPage?.lang ?? fallback,
    () => fallback,
  );
}

/** Código de la pantalla actual (para guardar el idioma en su sesión), o null fuera de un link con código. */
export function getCurrentCode(): string | null {
  return currentPage?.code ?? null;
}
