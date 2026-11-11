"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { SaveForLater } from "@/components/question/SaveForLater";
import { fill } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import type { Situation } from "@/lib/scoring";
import { PhaseSteps } from "./PhaseSteps";

/** Bloque oscuro de invitación a la fase 2 (invierte paper/ink). El título depende de la situación (docs/SPEC.md §3). */
export function UnlockPanel({
  code,
  href,
  open = false,
  situation = "leak",
  confirmed = false,
}: {
  code: string;
  /** Entrada a la fase 2 (/x/[code]/phase-2): el servidor decide si pide el correo, retoma o empieza. */
  href: string;
  open?: boolean;
  situation?: Situation;
  /** scale confirmado: puede decir "Your system works"; si no, solo lo que declaró el dueño. */
  confirmed?: boolean;
}) {
  const u = useConfig().copy.unlock;
  const title = situation === "leak" ? u.title : situation === "scale" && !confirmed ? u.titles.scaleDeclared : u.titles[situation];
  // A qué código quedaron guardadas las respuestas (en el camino abierto, sin mostrar el código).
  const msg = open ? u.savedToOpen : fill(u.savedTo, { code });
  return (
    <section className="mt-5 grid gap-3.5 bg-ink px-[18px] py-5 text-paper min-[561px]:px-8 min-[561px]:py-7">
      <div className="label-mono text-paper/75">{u.eyebrow}</div>
      <div className="my-1">
        <PhaseSteps />
      </div>
      <h2 className="text-[clamp(22px,4vw,28px)] uppercase">{title}</h2>
      <ul className="grid list-[square] gap-1.5 pl-[18px] marker:text-highlight">
        {u.bullets.map((b: string) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link href={href} className={buttonClass("primary", "bg-paper! text-ink! hover:bg-highlight! hover:text-highlight-ink!")}>
          {u.cta}
        </Link>
        <SaveForLater code={code} tone="inverse" open={open} />
      </div>
      <p className="text-sm text-paper/75">
        {msg}
      </p>
    </section>
  );
}
