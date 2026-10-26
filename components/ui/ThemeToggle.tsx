"use client";

import { useSyncExternalStore } from "react";
import { getConfig, type Lang } from "@/lib/config";

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
      className="label-mono flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 leading-none text-muted hover:border-accent hover:text-ink"
    >
      <span aria-hidden className="size-2.5 rounded-full border border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]" />
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
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line p-0.5">
      {ORDER.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => write(t)}
          className={`label-mono cursor-pointer rounded-full px-3 py-1.5 text-[11px] leading-none ${theme === t ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {copy.theme[t]}
        </button>
      ))}
    </div>
  );
}
