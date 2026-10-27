// Indexación por entorno. El entorno de pruebas (NEXT_PUBLIC_APP_URL con "xray-test", p. ej.
// https://xray-test.123spice.com) no se indexa: metadata robots en app/layout.tsx y cabecera X-Robots-Tag en
// next.config.ts. NEXT_PUBLIC_APP_URL se lee al compilar: cambiarla requiere volver a publicar.

export const NOINDEX = "noindex, nofollow";

export function isTestDeploy(appUrl: string | undefined | null): boolean {
  return !!appUrl && appUrl.toLowerCase().includes("xray-test");
}
