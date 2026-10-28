import Link from "next/link";
import { phase1, type Lang } from "@/lib/config";
import { HeaderControls } from "./HeaderControls";

/**
 * Encabezado del layout. El idioma llega como prop desde el layout raíz (una sola lectura en el servidor, la misma
 * que <html lang>): el HTML del servidor y el primer render del cliente coinciden.
 */
export function SiteHeader({ lang }: { lang: Lang }) {
  return (
    <header className="mx-auto flex max-w-report flex-wrap items-center gap-3 py-[18px]">
      <Link href="/" className="flex min-h-11 items-center gap-2 font-display text-lg font-extrabold tracking-[-0.02em]">
        <span aria-hidden className="relative size-[22px] border-2 border-accent after:absolute after:inset-1 after:bg-accent" />
        {phase1.copy.brand}
      </Link>
      <HeaderControls initialLang={lang} />
    </header>
  );
}
