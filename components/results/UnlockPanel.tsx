"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { SaveForLater } from "@/components/question/SaveForLater";
import { fill } from "@/lib/config";
import { useConfig } from "@/lib/i18n";

/** Bloque oscuro de invitación a la fase 2 (invierte paper/ink). */
export function UnlockPanel({ code, open = false }: { code: string; open?: boolean }) {
  const u = useConfig().copy.unlock;
  // Mensaje de la fase 2 después del clic; antes, a qué código quedaron guardadas las respuestas
  // (en el camino abierto, sin mostrar el código).
  const [pending, setPending] = useState(false);
  const msg = pending ? u.p2Pending : open ? u.savedToOpen : fill(u.savedTo, { code });
  return (
    <section className="mt-5 grid gap-3.5 bg-ink px-[18px] py-5 text-paper min-[561px]:px-8 min-[561px]:py-7">
      <div className="label-mono text-paper/75">{u.eyebrow}</div>
      <h2 className="text-[clamp(22px,4vw,28px)] uppercase">{u.title}</h2>
      <ul className="grid list-[square] gap-1.5 pl-[18px] marker:text-highlight">
        {u.bullets.map((b: string) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* TODO(fase 2): abrir el primer bloque. */}
        <button type="button" onClick={() => setPending(true)} className={buttonClass("primary", "bg-paper! text-ink! hover:bg-highlight! hover:text-highlight-ink!")}>
          {u.cta}
        </button>
        <SaveForLater code={code} tone="inverse" open={open} />
      </div>
      <p className="text-sm text-paper/75" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
