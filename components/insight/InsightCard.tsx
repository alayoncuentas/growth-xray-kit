"use client";

import { useConfig } from "@/lib/i18n";
import type { InsightView } from "@/lib/insights";

/** Texto con **negritas** simples, como los espejos del config. */
export function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part))}</>;
}

function Shell({ tag, myth = false, children }: { tag: string; myth?: boolean; children: React.ReactNode }) {
  return (
    // Aviso con barra lateral de 6px: turquesa para evidencia y espejos, naranja para mitos y el balde con agujeros.
    <div className={`mt-[22px] grid gap-2.5 border-2 border-l-[6px] px-[18px] py-3.5 ${myth ? "border-highlight bg-highlight-soft" : "border-line border-l-accent bg-card"}`}>
      <span className={`label-mono leading-none ${myth ? "text-ink" : "text-link"}`}>{tag}</span>
      {children}
    </div>
  );
}

function Source({ id, link = true }: { id: string; link?: boolean }) {
  const { evidence, copy } = useConfig();
  const e = evidence[id];
  return (
    <p className="border-t border-line pt-2 text-sm break-words text-muted">
      {copy.insight.source} {e.source}
      {link && (
        <>
          {" · "}
          <a href={e.url} target="_blank" rel="noopener" className="text-link underline underline-offset-2">
            {copy.insight.view}
          </a>
        </>
      )}
    </p>
  );
}

export function EvidenceCard({ id, lead, extraLead }: { id: string; lead?: string; extraLead?: string }) {
  const { evidence, copy } = useConfig();
  return (
    <Shell tag={copy.insight.evidenceTag}>
      {lead && <p className="text-lg leading-snug">{lead}</p>}
      <p>{evidence[id].text}</p>
      {extraLead && <p className="text-lg leading-snug">{extraLead}</p>}
      <Source id={id} />
    </Shell>
  );
}

export function MirrorCard({ text }: { text: string }) {
  const { copy } = useConfig();
  return (
    <Shell tag={copy.insight.mirrorTag}>
      <p>
        <Rich text={text} />
      </p>
    </Shell>
  );
}

export function MythCard({ id }: { id: string }) {
  const { myths, evidence, copy } = useConfig();
  const m = myths[id];
  const ev = m.evidence?.[0];
  return (
    <Shell tag={copy.insight.mythTag} myth>
      <p className="font-display text-xl font-bold text-ink-2 line-through decoration-highlight decoration-[3px]">“{m.myth}”</p>
      <p>{m.reality}</p>
      {ev && <p>{evidence[ev].text}</p>}
      {m.note && <p className="text-sm text-ink-2">{m.note}</p>}
      {ev && <Source id={ev} link={false} />}
    </Shell>
  );
}

function LeakyCard({ tag, lead, text, note }: { tag: string; lead: string; text: string; note?: string }) {
  return (
    <Shell tag={tag} myth>
      <p className="text-lg leading-snug">{lead}</p>
      <p>{text}</p>
      {note && <p className="text-sm text-ink-2">{note}</p>}
    </Shell>
  );
}

export function Insight({ view }: { view: InsightView }) {
  switch (view.kind) {
    case "evidence":
      return <EvidenceCard id={view.evidence} lead={view.lead} extraLead={view.extraLead} />;
    case "mirror":
      return <MirrorCard text={view.text} />;
    case "myth":
      return <MythCard id={view.myth} />;
    case "leaky":
      return <LeakyCard {...view} />;
  }
}
