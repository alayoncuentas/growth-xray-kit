/** Fallback de Suspense mientras se valida el código. */
export function LoadingCard() {
  return <div aria-busy className="mt-5 h-64 animate-pulse rounded-panel border border-line bg-card" />;
}
