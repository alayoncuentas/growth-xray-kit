"use client";

import { fill, usd } from "@/lib/config";
import { useConfig } from "@/lib/i18n";
import { adLeakPerThousand } from "@/lib/scoring";

/** "De cada $1,000 en anuncios…": solo si invierte en anuncios (spend > 0; lo decide quien lo muestra). */
export function AdCallout({ leak, adLeak }: { leak: number; adLeak: number }) {
  const m = useConfig().copy.money;
  const perThousand = adLeakPerThousand(leak);
  return (
    <section className="rounded-panel border border-line bg-card p-5">
      {/* Barra de $1,000: la parte naranja es lo que paga consultas que se escapan. El texto dice lo mismo. */}
      <div aria-hidden="true" className="mb-3 h-3 overflow-hidden rounded-[6px] bg-paper">
        <i className="block h-full bg-leak" style={{ width: `${perThousand / 10}%` }} />
      </div>
      <p className="text-[17px] font-semibold">{fill(m.adCallout, { perThousand: usd(perThousand) })}</p>
      <p className="mt-1 text-[15px] text-muted">{fill(m.adCalloutDetail, { adLeak: usd(adLeak) })}</p>
    </section>
  );
}
