/** Tarjeta grande de la entrada y la bienvenida (".gate" en el prototipo). */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`mt-5 rounded-panel border border-line bg-card p-[clamp(20px,5vw,40px)] ${className}`}>{children}</section>
  );
}

/** Panel del informe de resultados. */
export function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-card p-5">
      {title && <h2 className="mb-3.5 text-xl">{title}</h2>}
      {children}
    </section>
  );
}
