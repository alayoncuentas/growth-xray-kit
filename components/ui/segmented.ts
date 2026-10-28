// Selector segmentado (EN / ES, tema): cuadrado, borde de 2px, la opción elegida en naranja con texto negro.
// Cada opción mide 44px como mínimo (objetivo táctil).
export const segGroup = "inline-flex border-2 border-rule";

export function segItem(active: boolean) {
  return `label-mono min-h-10 min-w-11 cursor-pointer px-3 leading-none transition-colors duration-[140ms] ease-linear ${
    active ? "bg-highlight text-highlight-ink" : "text-ink-2 hover:bg-highlight-soft hover:text-ink"
  }`;
}
