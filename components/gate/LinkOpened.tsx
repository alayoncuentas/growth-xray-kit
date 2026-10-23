"use client";

import { useEffect } from "react";
import { markLinkOpened } from "@/app/actions";

// Una vez por código y carga de página (StrictMode monta los efectos dos veces en desarrollo).
const sent = new Set<string>();

/** Registra que se abrió el link: crea la sesión y el evento `link_opened` en el servidor. */
export function LinkOpened({ code }: { code: string }) {
  useEffect(() => {
    if (sent.has(code)) return;
    sent.add(code);
    markLinkOpened(code).catch((e) => console.warn("[link_opened]", e));
  }, [code]);
  return null;
}
