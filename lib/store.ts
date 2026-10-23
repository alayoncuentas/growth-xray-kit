"use client";

// Estado del diagnóstico en memoria del navegador, por código de acceso.
// Sobrevive a la navegación entre pantallas, no a una recarga.
// TODO(supabase): cada cambio se guarda con POST /api/answer y se rehidrata al volver con el código.

import { useSyncExternalStore } from "react";
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

/** Estado del código. En el servidor y durante la hidratación devuelve el estado vacío. */
export function useDiagnostic(code: string): DiagnosticState {
  return useSyncExternalStore(
    subscribe,
    () => getDiagnostic(code),
    () => EMPTY,
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
