/**
 * Etiqueta de estado: cuadrada, 12px, mayúsculas, siempre con texto.
 * new = turquesa (nuevo, correcto), highlight = naranja (activo, destacado), danger = rojo (perdido, error),
 * strong = contorno de tinta, neutral = contorno gris.
 */
export type BadgeTone = "new" | "highlight" | "danger" | "strong" | "neutral" | "solid";

const TONES: Record<BadgeTone, string> = {
  new: "border-accent bg-accent text-accent-ink",
  highlight: "border-highlight bg-highlight text-highlight-ink",
  danger: "border-bad text-danger",
  strong: "border-rule text-ink",
  neutral: "border-line text-ink-2",
  solid: "border-ink bg-ink text-paper",
};

export function Badge({ tone = "neutral", className = "", children, ...rest }: { tone?: BadgeTone; className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span className={`label-mono inline-flex items-center border-2 px-1.5 py-[3px] leading-tight ${TONES[tone]} ${className}`} {...rest}>
      {children}
    </span>
  );
}
