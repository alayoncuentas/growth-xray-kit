"use client";

import { useSyncExternalStore } from "react";
import { copy } from "@/lib/config";

type Theme = "system" | "light" | "dark";
const KEY = "gxr-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function write(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {}
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Alterna Auto (sigue al sistema) → Light → Dark. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      type="button"
      onClick={() => write(next)}
      aria-label={`${copy.theme.label}: ${copy.theme[theme]}`}
      className="label-mono flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 leading-none text-muted hover:border-accent hover:text-ink"
    >
      <span aria-hidden className="size-2.5 rounded-full border border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]" />
      {copy.theme[theme]}
    </button>
  );
}
