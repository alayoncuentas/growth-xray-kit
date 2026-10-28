// Campos de formulario: borde de 2px, fondo de superficie, etiqueta arriba (12px, mayúsculas) y error con ícono.

/** Campo de texto o select sin ancho (para filas flex): 44px de alto como mínimo; con aria-invalid el borde pasa a rojo. */
export const inputBase =
  "min-w-0 min-h-11 border-2 border-rule bg-card px-3.5 py-2.5 text-ink placeholder:text-muted aria-[invalid=true]:border-bad";

/** El mismo campo a todo el ancho. */
export const inputClass = `w-full ${inputBase}`;

export const labelClass = "label-mono text-ink";

/** Mensaje de error: ícono + texto en rojo oscuro (el texto dice qué pasó y cómo corregirlo). */
export function ErrorText({ children, className = "", ...rest }: { children: React.ReactNode; className?: string; id?: string; role?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-sm text-danger ${className}`} {...rest}>
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16" className="mt-[3px] flex-none">
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 4v5M8 11v1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
