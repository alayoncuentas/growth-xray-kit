// Formato de presentación. Funciones puras.

/**
 * Ancho medio de un carácter de la cifra grande, en "em" (Host Grotesk 800, tracking -0.04em, tabular-nums).
 * Medido en el navegador: ~0.53 em por carácter en "$63,000,000" y ~0.56 em en "$216,000"; 0.6 deja margen.
 */
export const FIGURE_GLYPH_EM = 0.6;

/** Tamaño de letra (px) para que `text` quepa en una línea de `width` px, sin pasar de `max`. */
export function figurePx(text: string, width: number, max = 72): number {
  return Math.min(max, width / (FIGURE_GLYPH_EM * Math.max(1, text.length)));
}

/**
 * El mismo cálculo en CSS, relativo al ancho del contenedor (`cqi`; el padre necesita `container-type: inline-size`).
 * Así la cifra de 11 caracteres ($63,000,000) entra en una línea a 400 px y las cortas llegan a `max`.
 */
export function figureFontSize(text: string, max = 72): string {
  const cqi = Math.floor((100 / (FIGURE_GLYPH_EM * Math.max(1, text.length))) * 100) / 100;
  return `min(${max}px, ${cqi}cqi)`;
}

/** Cantidad aproximada para un texto ("about 18", "about 0.3"): un decimal por debajo de 10, entero desde ahí. */
export function approx(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 1 : 0 });
}
