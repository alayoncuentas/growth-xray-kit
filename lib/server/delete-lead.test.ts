import { beforeEach, describe, expect, it, vi } from "vitest";

// deleteLead con la base y el CRM simulados: qué se borra, en qué orden y qué queda en deletion_log.

vi.mock("server-only", () => ({}));
vi.mock("./auth", () => ({ requireAdmin: async () => ({ email: "team@x.com" }) }));

const state = vi.hoisted(() => ({ ops: [] as { table: string; op: string; payload?: unknown; filters: unknown[] }[] }));
const crm = vi.hoisted(() => ({ deleteContacts: vi.fn() }));

vi.mock("./crm", async () => {
  class CrmUnavailableError extends Error {}
  return { CrmUnavailableError, deleteContacts: crm.deleteContacts };
});

vi.mock("./db", () => {
  function from(table: string) {
    const call = { table, op: "select", payload: undefined as unknown, filters: [] as unknown[] };
    const q: Record<string, unknown> = {};
    for (const m of ["select", "insert", "delete", "update"]) {
      q[m] = (p?: unknown) => {
        if (m !== "select" || call.op === "select") {
          if (m !== "select") {
            call.op = m;
            call.payload = p;
          }
        }
        return q;
      };
    }
    q.eq = (k: string, v: unknown) => (call.filters.push([k, v]), q);
    const result = () => {
      state.ops.push(call);
      if (table === "access_codes" && call.op === "select" && call.filters.some((f) => (f as unknown[])[0] === "company_id")) {
        return { data: [{ code: "AAAAA-11111", email: "a@x.com" }, { code: "BBBBB-22222", email: null }], error: null };
      }
      if (table === "access_codes" && call.op === "select") {
        return { data: { code: "AAAAA-11111", company_id: "co1", companies: { name: "Lakeview Plumbing" } }, error: null };
      }
      return { data: null, error: null };
    };
    q.maybeSingle = () => Promise.resolve(result());
    q.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, ko);
    return q;
  }
  return { db: () => ({ from }), must: (r: { data: unknown }) => r.data };
});

const { deleteLead } = await import("./admin-data");
const { CrmUnavailableError } = await import("./crm");

describe("Delete lead", () => {
  beforeEach(() => {
    state.ops = [];
    crm.deleteContacts.mockReset();
  });

  it("sin la confirmación correcta no borra nada", async () => {
    expect(await deleteLead("AAAAA-11111", "Lakeview")).toEqual({ ok: false, error: "mismatch" });
    expect(crm.deleteContacts).not.toHaveBeenCalled();
    expect(state.ops.some((o) => o.op === "delete")).toBe(false);
  });

  it("borra la empresa entera (cascada) y deja constancia sin datos del prospecto", async () => {
    crm.deleteContacts.mockResolvedValue({ status: "skipped", ids: [] });
    expect(await deleteLead("AAAAA-11111", "lakeview plumbing")).toEqual({ ok: true });
    expect(crm.deleteContacts).toHaveBeenCalledWith(["a@x.com"]);
    const del = state.ops.find((o) => o.op === "delete")!;
    expect(del.table).toBe("companies");
    expect(del.filters).toEqual([["id", "co1"]]);
    const log = state.ops.find((o) => o.table === "deletion_log")!;
    expect(log.payload).toEqual({ admin_email: "team@x.com", company_id: "co1", codes: 2, crm_status: "skipped", crm_ids: [] });
  });

  it("si el CRM no responde, no borra nada", async () => {
    crm.deleteContacts.mockRejectedValue(new CrmUnavailableError("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await deleteLead("AAAAA-11111", "Lakeview Plumbing")).toEqual({ ok: false, error: "crm" });
    expect(state.ops.some((o) => o.op === "delete" || o.table === "deletion_log")).toBe(false);
  });

  it("si un contacto del CRM no se pudo borrar, borra igual y guarda los ids para reintentar", async () => {
    crm.deleteContacts.mockResolvedValue({ status: "failed", ids: ["c1"] });
    expect(await deleteLead("AAAAA-11111", "Lakeview Plumbing")).toEqual({ ok: true });
    expect(state.ops.find((o) => o.table === "deletion_log")!.payload).toMatchObject({ crm_status: "failed", crm_ids: ["c1"] });
  });
});
