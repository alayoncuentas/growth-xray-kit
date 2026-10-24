// Campos de formulario del panel (sin estado: sirven en cliente y servidor).

export const inputClass = "w-full min-w-0 rounded-card border-[1.5px] border-line bg-paper px-3 py-2.5 text-ink";

export function Field({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={name} className="text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${name}-err`} className="text-[13px] text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
