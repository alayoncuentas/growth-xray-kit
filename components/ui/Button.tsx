import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "ghost" | "line" | "danger";

// Rectangulares, 44px de alto como mínimo. Cambio de relleno inmediato (140ms lineal) y escala .98 al pulsar.
const base =
  "inline-flex min-h-11 items-center justify-center gap-2.5 px-[22px] py-2.5 font-bold cursor-pointer transition-[background-color,color,border-color,transform] duration-[140ms] ease-linear active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  // Turquesa con texto negro; hover: naranja (texto negro también).
  primary: "bg-accent text-accent-ink hover:bg-highlight hover:text-highlight-ink disabled:hover:bg-accent",
  // Acción terciaria con aspecto de enlace (Back, Skip…): conserva el área táctil.
  ghost: "bg-transparent px-2 text-ink-2 underline-offset-4 hover:text-ink hover:underline",
  // Secundario: borde de 2px en la tinta; hover: relleno de tinta.
  line: "border-2 border-rule bg-transparent text-ink hover:bg-ink hover:text-paper disabled:hover:bg-transparent disabled:hover:text-ink",
  // Destructivo: borde rojo; hover: relleno rojo con texto blanco.
  danger: "border-2 border-bad bg-transparent text-danger hover:bg-bad hover:text-white disabled:hover:bg-transparent disabled:hover:text-danger",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

/** Flecha de las llamadas principales. Decorativa: la etiqueta del botón ya dice la acción. */
export function Arrow() {
  return (
    <span aria-hidden="true" className="text-[1.25em] leading-none">
      →
    </span>
  );
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
