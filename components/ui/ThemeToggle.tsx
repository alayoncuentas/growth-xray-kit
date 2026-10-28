"use client";

import { useSyncExternalStore } from "react";
import { getConfig, type Lang } from "@/lib/config";
import { segGroup, segItem } from "./segmented";

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

function apply(t: Theme) {
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

function write(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {}
  apply(t);
  listeners.forEach((l) => l());
}

// Otras pestañas y los marcos de /admin/preview (mismo origen) reciben el evento `storage` y se actualizan.
function onStorage(e: StorageEvent) {
  if (e.key !== KEY && e.key !== null) return;
  apply(read());
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(l);
  return () => {
    listeners.delete(l);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

/** Alterna Auto (sigue al sistema) → Light → Dark. Con los textos del idioma de la pantalla. */
export function ThemeToggle({ lang }: { lang: Lang }) {
  const copy = getConfig(lang).copy;
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      type="button"
      onClick={() => write(next)}
      aria-label={`${copy.theme.label}: ${copy.theme[theme]}`}
      className="label-mono flex min-h-10 min-w-11 items-center justify-center gap-1.5 border-2 border-rule px-2.5 leading-none text-ink-2 transition-colors duration-[140ms] ease-linear hover:bg-highlight-soft hover:text-ink"
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16" className="flex-none">
        <rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="2" y="2" width="6" height="12" fill="currentColor" />
      </svg>
      {/* En el teléfono, solo el ícono: así el encabezado (con EN / ES) entra en una línea. */}
      <span aria-hidden className="max-[479px]:hidden">
        {copy.theme[theme]}
      </span>
    </button>
  );
}

/** Selector explícito Auto / Light / Dark (vista previa del panel, en inglés). */
export function ThemeSwitch({ label }: { label: string }) {
  const copy = getConfig("en").copy;
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);
  return (
    <div role="radiogroup" aria-label={label} className={segGroup}>
      {ORDER.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => write(t)}
          className={segItem(theme === t)}
        >
          {copy.theme[t]}
        </button>
      ))}
    </div>
  );
}
