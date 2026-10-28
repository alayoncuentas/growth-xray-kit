/** Panel principal de la entrada, la bienvenida y los avisos: opaco, cuadrado, con borde de 2px. */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mt-5 border-2 border-rule bg-card p-[clamp(18px,5vw,36px)] ${className}`}>{children}</section>;
}

/** Panel de lectura del informe: borde de 2px e inset 14px 18px (algo más amplio en pantallas grandes). */
export function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="border-2 border-rule bg-card px-[18px] py-3.5 min-[561px]:px-6 min-[561px]:py-5">
      {title && <h2 className="mb-3.5 text-lg uppercase">{title}</h2>}
      {children}
    </section>
  );
}
