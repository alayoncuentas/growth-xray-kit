import "server-only";

// GoHighLevel (LeadConnector API v2). Por ahora solo el borrado para "Delete lead"; el sync de contactos llega con
// la integración (docs/OPEN_ENTRY.md §6). Sin GHL_PRIVATE_INTEGRATION_TOKEN y GHL_LOCATION_ID no hace nada.
// Endpoints según la documentación pública de LeadConnector; verificar con una cuenta real antes de encenderlo.

const API = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";
const TIMEOUT_MS = 8000;

export type CrmStatus = "skipped" | "ok" | "failed";

/** No se pudo consultar el CRM: quien llama no debe borrar nada (después no habría con qué reintentar). */
export class CrmUnavailableError extends Error {}

export interface CrmConfig {
  token?: string;
  locationId?: string;
  fetch?: typeof fetch;
}

const envConfig = (): CrmConfig => ({ token: process.env.GHL_PRIVATE_INTEGRATION_TOKEN, locationId: process.env.GHL_LOCATION_ID });

/**
 * Borra en GHL los contactos con estos correos. `skipped` sin integración configurada; `ok` si se borraron todos los
 * que existían; `failed` si alguno encontrado no se pudo borrar (sus ids quedan para reintentar). Lanza
 * CrmUnavailableError si no pudo buscar los contactos.
 */
export async function deleteContacts(emails: string[], cfg: CrmConfig = envConfig()): Promise<{ status: CrmStatus; ids: string[] }> {
  if (!cfg.token || !cfg.locationId) return { status: "skipped", ids: [] };
  const f = cfg.fetch ?? fetch;
  const headers = { Authorization: `Bearer ${cfg.token}`, Version: VERSION, Accept: "application/json" };

  const ids: string[] = [];
  for (const email of [...new Set(emails)]) {
    const url = `${API}/contacts/search/duplicate?locationId=${encodeURIComponent(cfg.locationId)}&email=${encodeURIComponent(email)}`;
    let res: Response;
    try {
      res = await f(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      throw new CrmUnavailableError(`GHL lookup: ${(e as Error).message}`);
    }
    if (!res.ok) throw new CrmUnavailableError(`GHL lookup ${res.status}`);
    const body = (await res.json().catch(() => ({}))) as { contact?: { id?: string } | null };
    if (body.contact?.id) ids.push(body.contact.id);
  }

  let failed = false;
  for (const id of ids) {
    try {
      const res = await f(`${API}/contacts/${encodeURIComponent(id)}`, { method: "DELETE", headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok && res.status !== 404) failed = true; // 404: ya no estaba
    } catch {
      failed = true;
    }
  }
  return { status: failed ? "failed" : "ok", ids };
}
