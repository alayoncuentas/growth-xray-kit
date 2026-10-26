"use client";

import { useConfig } from "@/lib/i18n";
import type { InsightView } from "@/lib/insights";

/** Texto con **negritas** simples, como los espejos del config. */
export function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : part))}</>;
}

function Shell({ tag, myth = false, children }: { tag: string; myth?: boolean; children: React.ReactNode }) {
  return (
    <div className={`mt-[22px] grid animate-rise gap-2.5 rounded-card px-[18px] pt-[18px] pb-4 ${myth ? "bg-leak-soft" : "border border-line bg-card"}`}>
      <span className={`label-mono leading-none tracking-[0.09em] ${myth ? "text-leak" : "text-accent"}`}>{tag}</span>
      {children}
    </div>
  );
}

function Source({ id, link = true }: { id: string; link?: boolean }) {
  const { evidence, copy } = useConfig();
  const e = evidence[id];
  return (
    <p className="border-t border-dashed border-line pt-2 font-mono text-xs break-words text-muted">
      {copy.insight.source} {e.source}
      {link && (
        <>
          {" · "}
          <a href={e.url} target="_blank" rel="noopener" className="underline">
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
      {lead && <p className="font-semibold">{lead}</p>}
      <p>{evidence[id].text}</p>
      {extraLead && <p className="font-semibold">{extraLead}</p>}
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
      <p className="font-display text-xl line-through decoration-leak decoration-2 opacity-85">“{m.myth}”</p>
      <p>{m.reality}</p>
      {ev && <p>{evidence[ev].text}</p>}
      {m.note && <p className="text-[13px] text-muted">{m.note}</p>}
      {ev && <Source id={ev} link={false} />}
    </Shell>
  );
}

function LeakyCard({ tag, lead, text, note }: { tag: string; lead: string; text: string; note?: string }) {
  return (
    <Shell tag={tag} myth>
      <p className="font-semibold">{lead}</p>
      <p>{text}</p>
      {note && <p className="text-[13px] text-muted">{note}</p>}
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
