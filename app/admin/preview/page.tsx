import { Suspense } from "react";
import { TeamView } from "@/components/admin/TeamView";
import { Insight } from "@/components/insight/InsightCard";
import { PhoneFrame } from "@/components/preview/PhoneFrame";
import { PreviewLangSwitch } from "@/components/preview/PreviewLangSwitch";
import { buttonClass } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { ThemeSwitch } from "@/components/ui/ThemeToggle";
import { DEFAULT_LANG, fill, getConfig, isChoice, type Lang } from "@/lib/config";
import { LangScope } from "@/lib/i18n";
import { progress } from "@/lib/flow";
import { insightCases, preview, previewCompany, SAMPLE_IDS, sampleState } from "@/lib/preview";
import { visibleQuestions } from "@/lib/scoring";
import { cookieLang } from "@/lib/server/access";
import { requireAdmin } from "@/lib/server/auth";
import { adminCopy } from "@/lib/server/team";
import type { ArchetypeId, Question } from "@/lib/types";

// Vista previa del diagnóstico. Solo lectura: los marcos cargan las rutas reales con códigos de vista previa,
// que solo existen con sesión de admin y nunca escriben en la base (ver lib/server/access.ts y /api/answer).

const X = (code: string, path = "", query = "") => `/x/${code}${path}?frame=1${query}`;
/** El mismo destino fuera del marco (con la barra del modo recorrido). */
const unframed = (src: string) => src.replace("?frame=1&", "?").replace("?frame=1", "");

export default function PreviewPage() {
  return (
    <main>
      <Suspense fallback={<LoadingCard />}>
        <Preview />
      </Suspense>
    </main>
  );
}

interface Screen {
  id: string;
  label: string;
  part: string | null;
  src: string;
  question?: Question;
}

function screens(lang: Lang): Screen[] {
  const p = adminCopy.preview;
  const phase1 = getConfig(lang);
  // Las preguntas usan el negocio sin rubro conocido, para que aparezca también la de rubro.
  const qs = visibleQuestions(phase1, preview.plainCompany.industry);
  const questions = qs.map((q) => {
      const pr = progress(phase1, q.id, preview.plainCompany.industry)!;
      return {
        id: q.id,
        label: q.prompt,
        part: fill(p.partLabel, { n: pr.sectionIndex + 1, label: pr.sectionLabel }),
        // La calculadora se muestra con respuestas de ejemplo, para que el % que se escapa venga calculado.
        src: X(preview.plainCode, `/q/${q.id}`, q.type === "calculator" ? "&sample=leaky" : ""),
        question: q,
      } satisfies Screen;
  });
  // Camino abierto (docs/OPEN_ENTRY.md): los datos del negocio van justo después de la pregunta de rubro.
  const afterIndustry = questions.findIndex((s) => s.id === "industry") + 1;
  const business: Screen = { id: "business", label: p.screens.business, part: p.openPart, src: X(preview.plainCode, "/business") };
  return [
    { id: "gate", label: p.screens.gate, part: null, src: "/?frame=1" },
    { id: "start", label: p.screens.start, part: p.openPart, src: "/?frame=1&preview=open" },
    { id: "welcome", label: p.screens.welcomeOutside, part: null, src: X(preview.code) },
    { id: "welcome-plain", label: p.screens.welcomePlain, part: null, src: X(preview.plainCode) },
    ...questions.slice(0, afterIndustry),
    business,
    ...questions.slice(afterIndustry),
    { id: "email-open", label: p.screens.emailOpen, part: p.openPart, src: X(preview.code, "/email", "&sample=leaky&open=1") },
    { id: "email-invited", label: p.screens.emailInvited, part: null, src: X(preview.code, "/email", "&sample=ready") },
    { id: "partial", label: p.screens.partial, part: p.openPart, src: X(preview.code, "/results", "&sample=leaky&partial=1") },
    { id: "results", label: p.screens.results, part: null, src: X(preview.code, "/results", "&sample=leaky") },
    { id: "results-gift-b", label: p.screens.resultsGiftB, part: null, src: X(preview.code, "/results", "&sample=ready") },
    { id: "results-max", label: p.screens.resultsMax, part: null, src: X(preview.code, "/results", "&sample=leaky&calc=max") },
    { id: "report", label: p.screens.report, part: null, src: `/r/${preview.code}?frame=1&sample=leaky` },
  ];
}

async function Preview() {
  await requireAdmin();
  const p = adminCopy.preview;
  // Idioma de las pantallas: la cookie del botón EN / ES (los marcos son las rutas reales y la leen igual).
  const lang = (await cookieLang()) ?? DEFAULT_LANG;
  const phase1 = getConfig(lang);
  const list = screens(lang);

  return (
    <div className="grid gap-10">
      <header className="grid gap-4">
        <div>
          <Eyebrow>{p.eyebrow}</Eyebrow>
          <h1 className="mb-2 text-[clamp(28px,5vw,40px)] tracking-[-0.02em]">{p.title}</h1>
          <p className="max-w-[640px] text-muted">{p.sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">{p.theme}</span>
          <ThemeSwitch label={p.theme} />
          <span className="text-sm text-muted">{p.lang}</span>
          <PreviewLangSwitch lang={lang} label={p.lang} names={p.langNames} />
          <span className="basis-full text-[13px] text-muted">{p.langNote}</span>
        </div>
        <nav aria-label={p.indexTitle} className="rounded-panel border border-line bg-card p-4 text-sm">
          <div className="label-mono mb-2 text-[11px] text-muted">{p.indexTitle}</div>
          <ol className="grid gap-1.5">
            <li>
              <a href="#walk" className="underline underline-offset-2">
                {p.sections.walk}
              </a>
            </li>
            <li>
              <a href="#map" className="underline underline-offset-2">
                {p.sections.map}
              </a>
              <ol className="mt-1.5 flex flex-wrap gap-1.5">
                {list.map((s) => (
                  <li key={s.id}>
                    <a href={`#s-${s.id}`} className="block rounded-full border border-line px-2 py-1 font-mono text-xs hover:border-accent">
                      {s.id}
                    </a>
                  </li>
                ))}
              </ol>
            </li>
            <li>
              <a href="#archetypes" className="underline underline-offset-2">
                {p.sections.archetypes}
              </a>
              <ol className="mt-1.5 flex flex-wrap gap-1.5">
                {SAMPLE_IDS.map((id) => (
                  <li key={id}>
                    <a href={`#a-${id}`} className="block rounded-full border border-line px-2 py-1 text-xs hover:border-accent">
                      {phase1.archetypes[id].name}
                    </a>
                  </li>
                ))}
              </ol>
            </li>
          </ol>
        </nav>
      </header>

      <section id="walk" className="grid scroll-mt-4 gap-3 rounded-panel border border-accent bg-accent-soft p-5">
        <h2 className="text-xl">{p.sections.walk}</h2>
        <p className="max-w-[640px] text-sm">{p.trySub}</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <a href={`/x/${preview.code}`} target="_blank" rel="noreferrer" className={buttonClass("primary")}>
            {p.try}
          </a>
          <a href={`/x/${preview.plainCode}`} target="_blank" rel="noreferrer" className={buttonClass("line")}>
            {p.tryPlain}
          </a>
        </div>
      </section>

      <section id="map" className="grid scroll-mt-4 gap-8">
        <div>
          <h2 className="mb-1.5 text-2xl">{p.sections.map}</h2>
          <p className="max-w-[640px] text-sm text-muted">{p.mapSub}</p>
        </div>
        {list.map((s, i) => (
          <article key={s.id} id={`s-${s.id}`} className="grid scroll-mt-4 gap-3 border-t border-line pt-6">
            <ScreenHeader n={i + 1} id={s.id} part={s.part} label={s.label} src={s.src} />
            <PhoneFrame key={lang} src={s.src} title={`${s.id} · ${s.label}`} />
            {s.question && <InsightVariants q={s.question} lang={lang} />}
          </article>
        ))}
      </section>

      <section id="archetypes" className="grid scroll-mt-4 gap-8">
        <div>
          <h2 className="mb-1.5 text-2xl">{p.sections.archetypes}</h2>
          <p className="max-w-[640px] text-sm text-muted">{p.archetypesSub}</p>
        </div>
        {SAMPLE_IDS.map((id) => (
          <Archetype key={id} id={id} lang={lang} />
        ))}
      </section>
    </div>
  );
}

function ScreenHeader({ n, id, part, label, src }: { n: number; id: string; part: string | null; label: string; src: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-mono text-xs text-muted tabular-nums">{String(n).padStart(2, "0")}</span>
      <code className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-sm">{id}</code>
      {part && <span className="label-mono text-[11px] text-accent">{part}</span>}
      <span className="basis-full text-sm min-[700px]:basis-auto">{label}</span>
      <a href={unframed(src)} target="_blank" rel="noreferrer" className="ml-auto text-sm text-muted underline underline-offset-2">
        {adminCopy.preview.open}
      </a>
    </div>
  );
}

/** Cada opción con el insight exacto que mostraría el flujo real (mismo insightFor, mismo componente). */
function InsightVariants({ q, lang }: { q: Question; lang: Lang }) {
  const p = adminCopy.preview;
  if (!isChoice(q)) return <p className="text-sm text-muted">{p.calcNote}</p>;
  const cases = insightCases(getConfig(lang), q, previewCompany("outside", lang).outside?.lastReview ?? "");
  return (
    <details open className="rounded-panel border border-line bg-card p-4">
      <summary className="cursor-pointer font-semibold">{p.insightsTitle}</summary>
      <ul className="mt-3 grid gap-4 min-[860px]:grid-cols-2">
        {cases.map((c) => (
          <li key={`${c.optionId}-${c.context ?? "all"}`} className="grid content-start gap-1.5">
            <div className="text-sm">
              <code className="mr-1.5 font-mono text-xs text-muted">{c.optionId}</code>
              <b>{c.optionLabel}</b>
              {c.context && <span className="label-mono ml-1.5 text-[11px] text-accent">· {p.contexts[c.context]}</span>}
            </div>
            {c.view ? (
              <div className="max-w-[368px] [&>*]:mt-0">
                <LangScope lang={lang}>
                  <Insight view={c.view} />
                </LangScope>
              </div>
            ) : (
              <p className="text-sm text-muted">{c.autoAdvance ? p.autoAdvance : p.multiNote}</p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Resultados con una muestra de respuestas, al lado de la vista del equipo. */
function Archetype({ id, lang }: { id: ArchetypeId; lang: Lang }) {
  const phase1 = getConfig(lang);
  const s = sampleState(id);
  const src = X(preview.code, "/results", `&sample=${id}`);
  return (
    <article id={`a-${id}`} className="grid scroll-mt-4 gap-3 border-t border-line pt-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-xl">{phase1.archetypes[id].name}</h3>
        <code className="font-mono text-xs text-muted">sample={id}</code>
        <a href={unframed(src)} target="_blank" rel="noreferrer" className="ml-auto text-sm text-muted underline underline-offset-2">
          {adminCopy.preview.open}
        </a>
      </div>
      <div className="grid items-start gap-5 min-[920px]:grid-cols-[402px_minmax(0,1fr)]">
        <PhoneFrame key={lang} src={src} title={`${phase1.copy.results.eyebrow} · ${phase1.archetypes[id].name}`} />
        <div className="grid gap-4 min-[920px]:sticky min-[920px]:top-4">
          <TeamView code={preview.code} answers={s.answers} calc={s.calc} />
          <details className="rounded-panel border border-line bg-card p-4 text-sm">
            <summary className="cursor-pointer font-semibold">{adminCopy.preview.sampleAnswers}</summary>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
              {phase1.questions.map((q) => {
                const a = q.type === "calculator" ? null : s.answers[q.id];
                const ids = Array.isArray(a) ? a : a ? [a] : [];
                const value =
                  q.type === "calculator"
                    ? Object.entries(s.calc)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(" · ") || "—"
                    : isChoice(q)
                      ? ids.map((x) => q.options.find((o) => o.id === x)?.label ?? x).join(" · ") || "—"
                      : "—";
                return (
                  <div key={q.id} className="contents">
                    <dt className="font-mono text-xs text-muted">{q.id}</dt>
                    <dd>{value}</dd>
                  </div>
                );
              })}
            </dl>
          </details>
        </div>
      </div>
    </article>
  );
}
