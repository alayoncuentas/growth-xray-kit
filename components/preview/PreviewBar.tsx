"use client";

import { useRouter } from "next/navigation";
import { phase1 } from "@/lib/config";
import { SAMPLE_IDS, sampleState } from "@/lib/preview";
import { visibleQuestions } from "@/lib/scoring";
import { replaceDiagnostic } from "@/lib/store";

type Copy = Record<"label" | "jump" | "welcome" | "results" | "sample" | "reset" | "back", string>;

const selectClass = "min-h-11 w-full min-w-0 cursor-pointer min-[560px]:w-[220px] border-2 border-paper/60 bg-transparent px-3 py-1.5 text-paper [&>option]:text-ink";

/** Barra del modo recorrido: saltar a cualquier pantalla, cargar una muestra o empezar de cero. Nada se guarda. */
export function PreviewBar({ code, knownIndustry, t }: { code: string; knownIndustry?: string | null; t: Copy }) {
  const router = useRouter();
  const base = `/x/${encodeURIComponent(code)}`;
  const qs = visibleQuestions(phase1, knownIndustry);

  return (
    <>
      <div aria-hidden className="h-40 min-[700px]:h-16" />
      <div role="region" aria-label={t.label} className="fixed inset-x-0 bottom-0 z-50 bg-ink text-paper">
        <div className="mx-auto flex max-w-report flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
          <span className="label-mono w-full text-paper/75 min-[700px]:w-auto">{t.label}</span>
          <select aria-label={t.jump} value="" onChange={(e) => router.push(e.target.value)} className={selectClass}>
            <option value="" disabled>
              {t.jump}
            </option>
            <option value={base}>{t.welcome}</option>
            {qs.map((q, i) => (
              <option key={q.id} value={`${base}/q/${q.id}`}>
                {i + 1}. {q.id} · {q.prompt.length > 48 ? `${q.prompt.slice(0, 47)}…` : q.prompt}
              </option>
            ))}
            <option value={`${base}/results`}>{t.results}</option>
          </select>
          <select
            aria-label={t.sample}
            value=""
            onChange={(e) => {
              const id = SAMPLE_IDS.find((s) => s === e.target.value);
              if (!id) return;
              replaceDiagnostic(code, sampleState(id));
              router.push(`${base}/results`);
            }}
            className={selectClass}
          >
            <option value="" disabled>
              {t.sample}
            </option>
            {SAMPLE_IDS.map((id) => (
              <option key={id} value={id}>
                {phase1.archetypes[id].name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              replaceDiagnostic(code, { answers: {}, calc: {} });
              router.push(base);
            }}
            className="min-h-11 cursor-pointer border-2 border-paper/60 px-3 py-1.5 font-bold hover:bg-paper hover:text-ink"
          >
            {t.reset}
          </button>
          <a href="/admin/preview" className="ml-auto inline-flex min-h-11 items-center underline underline-offset-4">
            {t.back}
          </a>
        </div>
      </div>
    </>
  );
}
