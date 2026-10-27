"use client";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { fill } from "@/lib/config";
import type { GiftKind } from "@/lib/gifts";
import { useConfig } from "@/lib/i18n";
import { phase1Result } from "@/lib/scoring";
import type { Answers, CalcOverrides, Company } from "@/lib/types";
import { ArchetypeHeader } from "./ArchetypeHeader";
import { EmailForm } from "./EmailForm";
import { IndexMeter } from "./IndexMeter";
import { MoneyHero } from "./MoneyHero";

/**
 * Resultado parcial (camino abierto sin correo, docs/OPEN_ENTRY.md decisión 2): arquetipo, índice y la cifra principal
 * del dinero en juego (anual, sin desglose). Los clientes al año, el escenario prudente, "How we calculate it", los
 * anuncios, los pilares, los hallazgos, el primer paso, el informe y el regalo se desbloquean con el correo.
 */
export function PartialResults({ code, answers, calc, company, gift }: { code: string; answers: Answers; calc: CalcOverrides; company: Company | null; gift: GiftKind }) {
  const cfg = useConfig();
  const t = cfg.copy.results;
  const p = cfg.copy.partial;
  const res = phase1Result(cfg, answers, calc);
  return (
    <>
      <Eyebrow>
        {t.eyebrow}
        {company?.business ? ` · ${company.business}` : ""}
      </Eyebrow>
      <ArchetypeHeader archetype={res.archetype} />

      <div className="grid gap-5">
        <MoneyHero calc={res.calc} figureOnly />
        <section className="rounded-panel border border-line bg-card p-5">
          <IndexMeter avg={res.avg} band={res.band} />
        </section>
      </div>

      <section className="mt-5 grid gap-3.5 rounded-panel border border-line bg-card p-[clamp(20px,4vw,32px)]">
        <h2 className="text-[clamp(22px,4vw,28px)]">{p.title}</h2>
        <p className="max-w-[60ch] text-muted">{fill(p.text, { giftShort: cfg.copy.gifts[gift].short })}</p>
        <EmailForm code={code} from="partial" gift={gift} />
      </section>
    </>
  );
}
