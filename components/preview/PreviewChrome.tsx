import "server-only";
import type { Access } from "@/lib/server/access";
import { adminCopy } from "@/lib/server/team";
import { PreviewBar } from "./PreviewBar";

/** Barra del modo recorrido en las pantallas reales. No aparece dentro de los marcos de /admin/preview (?frame=1). */
export function PreviewChrome({ access, frame }: { access: Access; frame: boolean }) {
  if (!access.preview || frame) return null;
  return <PreviewBar code={access.code} knownIndustry={access.company?.industry} t={adminCopy.preview.bar} />;
}
