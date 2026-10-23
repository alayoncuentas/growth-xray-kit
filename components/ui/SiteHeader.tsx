import Link from "next/link";
import { copy } from "@/lib/config";
import { Chip } from "./Chip";
import { PreparedFor } from "./PreparedFor";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-report flex-wrap items-center gap-3 py-[18px]">
      <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-[-0.01em]">
        <span aria-hidden className="relative size-[22px] rounded-full border-2 border-accent after:absolute after:inset-1 after:rounded-full after:bg-accent" />
        {copy.brand}
      </Link>
      <Chip>{copy.phaseChip}</Chip>
      <span className="flex-1" />
      <PreparedFor />
      <ThemeToggle />
    </header>
  );
}
