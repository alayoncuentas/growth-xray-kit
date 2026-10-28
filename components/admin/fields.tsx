import { ErrorText, labelClass } from "@/components/ui/field";
// Campos de formulario del panel (sin estado: sirven en cliente y servidor).

export { inputClass } from "@/components/ui/field";

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
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      {children}
      {error && (
        <ErrorText id={`${name}-err`}>
          {error}
        </ErrorText>
      )}
    </div>
  );
}
