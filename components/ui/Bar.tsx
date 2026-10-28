/** Barra de puntaje medida (pilares, ejes del equipo): esquinas cuadradas sobre una pista suave. */
export function Bar({ value, tone = "accent" }: { value: number; tone?: "good" | "warn" | "bad" | "accent" }) {
  const bg = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", accent: "bg-accent" }[tone];
  return (
    <div className="h-2.5 overflow-hidden bg-card-2">
      <i className={`block h-full ${bg}`} style={{ width: `${value}%` }} />
    </div>
  );
}
