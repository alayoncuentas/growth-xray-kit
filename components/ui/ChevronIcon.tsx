/** Flecha hacia abajo (desplegables). Decorativa: <summary> ya expone si está abierto o cerrado. */
export function ChevronIcon({ className = "", size = 20 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square" />
    </svg>
  );
}
