"use client";

import { useEffect } from "react";
import { setCurrentBusiness } from "@/lib/store";

/** Le avisa al encabezado para qué negocio es el diagnóstico ("Prepared for …"). */
export function BusinessMarker({ business }: { business: string | null }) {
  useEffect(() => {
    setCurrentBusiness(business);
    return () => setCurrentBusiness(null);
  }, [business]);
  return null;
}
