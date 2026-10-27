import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { CrmUnavailableError, deleteContacts } = await import("./crm");

/** fetch falso: busca por correo en `contacts` y registra los DELETE. */
function fakeFetch(contacts: Record<string, string>, opts: { lookupStatus?: number; deleteStatus?: number; throwOn?: "lookup" } = {}) {
  const deleted: string[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    if (init?.method === "DELETE") {
      deleted.push(decodeURIComponent(u.pathname.split("/").pop()!));
      return new Response(null, { status: opts.deleteStatus ?? 200 });
    }
    if (opts.throwOn === "lookup") throw new Error("network");
    if (opts.lookupStatus) return new Response("{}", { status: opts.lookupStatus });
    const id = contacts[u.searchParams.get("email") ?? ""];
    return Response.json({ contact: id ? { id } : null });
  });
  return { f: f as unknown as typeof fetch, deleted, calls: f };
}

const cfg = { token: "pit-test", locationId: "loc1" };

describe("CRM: borrar contactos (Delete lead)", () => {
  it("sin integración configurada no llama a nada", async () => {
    const { f, calls } = fakeFetch({});
    expect(await deleteContacts(["a@x.com"], { fetch: f })).toEqual({ status: "skipped", ids: [] });
    expect(calls).not.toHaveBeenCalled();
  });

  it("busca cada correo una vez y borra los que existen", async () => {
    const { f, deleted, calls } = fakeFetch({ "a@x.com": "c1" });
    expect(await deleteContacts(["a@x.com", "a@x.com", "b@x.com"], { ...cfg, fetch: f })).toEqual({ status: "ok", ids: ["c1"] });
    expect(deleted).toEqual(["c1"]);
    expect(calls).toHaveBeenCalledTimes(3); // 2 búsquedas + 1 borrado
    const [url, init] = calls.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("locationId=loc1");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer pit-test");
  });

  it("si un borrado falla: failed, con los ids para reintentar", async () => {
    const { f } = fakeFetch({ "a@x.com": "c1" }, { deleteStatus: 500 });
    expect(await deleteContacts(["a@x.com"], { ...cfg, fetch: f })).toEqual({ status: "failed", ids: ["c1"] });
  });

  it("si no puede buscar, lanza CrmUnavailableError (quien llama no borra nada)", async () => {
    await expect(deleteContacts(["a@x.com"], { ...cfg, fetch: fakeFetch({}, { lookupStatus: 401 }).f })).rejects.toBeInstanceOf(CrmUnavailableError);
    await expect(deleteContacts(["a@x.com"], { ...cfg, fetch: fakeFetch({}, { throwOn: "lookup" }).f })).rejects.toBeInstanceOf(CrmUnavailableError);
  });
});
