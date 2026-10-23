"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { copy, fill } from "@/lib/config";

/** Bloque oscuro de invitación a la fase 2 (invierte paper/ink). */
export function UnlockPanel({ code }: { code: string }) {
  const u = copy.unlock;
  const [msg, setMsg] = useState<string>(fill(u.savedTo, { code }));
  return (
    <section className="mt-5 grid gap-3.5 rounded-panel bg-ink p-[clamp(20px,4vw,32px)] text-paper">
      <div className="label-mono text-xs opacity-70">{u.eyebrow}</div>
      <h2 className="text-[clamp(24px,4vw,30px)]">{u.title}</h2>
      <ul className="grid list-disc gap-1.5 pl-[18px]">
        {u.bullets.map((b: string) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* TODO(fase 2): abrir el primer bloque. TODO(resend): "guardar y seguir" envía el link por correo. */}
        <button type="button" onClick={() => setMsg(u.p2Pending)} className={buttonClass("primary", "bg-paper! text-ink!")}>
          {u.cta}
        </button>
        <button type="button" onClick={() => setMsg(fill(u.savedMsg, { code }))} className={buttonClass("line", "border-paper/40! text-paper!")}>
          {u.later}
        </button>
      </div>
      <p className="text-[13px] text-paper/70" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
