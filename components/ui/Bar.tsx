/** Barra de puntaje medida (pilares, ejes del equipo). */
export function Bar({ value, tone = "accent" }: { value: number; tone?: "good" | "warn" | "bad" | "accent" }) {
  const bg = { good: "bg-good", warn: "bg-warn", bad: "bg-bad", accent: "bg-accent" }[tone];
  return (
    <div className="h-2.5 overflow-hidden rounded-[5px] bg-paper">
      <i className={`block h-full rounded-[5px] ${bg}`} style={{ width: `${value}%` }} />
    </div>
  );
}
