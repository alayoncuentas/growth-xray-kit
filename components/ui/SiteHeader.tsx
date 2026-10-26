import Link from "next/link";
import { Suspense } from "react";
import { DEFAULT_LANG, getConfig, phase1 } from "@/lib/config";
import { cookieLang } from "@/lib/server/access";
import { Chip } from "./Chip";
import { HeaderControls } from "./HeaderControls";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-report flex-wrap items-center gap-3 py-[18px]">
      <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.01em]">
        <span aria-hidden className="relative size-[22px] rounded-full border-2 border-accent after:absolute after:inset-1 after:rounded-full after:bg-accent" />
        {phase1.copy.brand}
      </Link>
      <Suspense fallback={<Chip>{getConfig(DEFAULT_LANG).copy.phaseChip}</Chip>}>
        <WithCookie />
      </Suspense>
    </header>
  );
}

/** El encabezado vive en el layout: arranca con el idioma de la cookie y después sigue al de la pantalla. */
async function WithCookie() {
  return <HeaderControls cookieLang={(await cookieLang()) ?? DEFAULT_LANG} />;
}
