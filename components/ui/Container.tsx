/** Columna angosta para la entrevista; ancha para el informe. */
export function Container({ wide = false, children }: { wide?: boolean; children: React.ReactNode }) {
  return <main className={`mx-auto ${wide ? "max-w-report" : "max-w-interview"}`}>{children}</main>;
}
