"use client";

import { fill } from "@/lib/config";
import type { GiftKind } from "@/lib/gifts";
import { useConfig } from "@/lib/i18n";

/** Regalo ofrecido (docs/OPEN_ENTRY.md §2): qué es, qué haremos y a qué correo. Nunca muestra los puntajes que lo deciden. */
export function GiftPanel({ kind, to }: { kind: GiftKind; to: string }) {
  const g = useConfig().copy.gifts;
  const t = g[kind];
  return (
    <section className="mt-5 grid gap-2.5 border-2 border-l-[6px] border-rule border-l-accent bg-card px-[18px] py-4 min-[561px]:px-7 min-[561px]:py-6">
      <div className="label-mono text-link">{g.eyebrow}</div>
      <h2 className="text-[clamp(20px,3.6vw,26px)]">{t.title}</h2>
      <p className="max-w-[62ch]">{t.text}</p>
      <p role="status" className="text-sm text-ink-2">
        {fill(t.status, { to })}
      </p>
    </section>
  );
}
