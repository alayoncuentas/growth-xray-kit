"use client";

import { useConfig } from "@/lib/i18n";
import type { ArchetypeId } from "@/lib/types";

/** Título de los resultados: el arquetipo y su línea. El índice va aparte (IndexMeter). */
export function ArchetypeHeader({ archetype }: { archetype: ArchetypeId }) {
  const a = useConfig().archetypes[archetype];
  return (
    <div className="mt-2 mb-6">
      <h1 className="display text-[clamp(34px,7vw,56px)]">{a.name}</h1>
      <p className="mt-3 max-w-[52ch] text-lg text-ink-2">{a.line}</p>
    </div>
  );
}
