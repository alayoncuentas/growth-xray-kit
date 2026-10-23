export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`label-mono mb-2.5 text-xs text-accent ${className}`}>{children}</div>;
}
