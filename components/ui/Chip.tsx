export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="label-mono rounded-full border border-line px-2 py-1.5 leading-none text-muted">{children}</span>;
}
