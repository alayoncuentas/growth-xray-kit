import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_CONSENT_VERSION } from "@/lib/email";

// "Save and finish later" con una base falsa en memoria: qué escribe en access_codes y en events.

vi.mock("server-only", () => ({}));

interface Call {
  table: string;
  op: string;
  payload?: unknown;
  filters: [string, string, unknown][];
}

const state = vi.hoisted(() => ({ calls: [] as Call[], email: null as string | null, emailUpdated: true }));

vi.mock("./db", () => {
  /** Constructor de consultas encadenable: registra la operación y responde según la tabla. */
  function from(table: string) {
    const call: Call = { table, op: "select", filters: [] };
    const q: Record<string, unknown> = {};
    const chain = (name: string) => (...args: unknown[]) => {
      if (["select", "update", "insert", "delete"].includes(name) && call.op === "select") {
        call.op = name;
        if (name !== "select") call.payload = args[0];
      }
      if (["eq", "is", "gte", "lt", "in"].includes(name)) call.filters.push([name, String(args[0]), args[1]]);
      return q;
    };
    for (const m of ["select", "update", "insert", "delete", "eq", "is", "gte", "lt", "in"]) q[m] = chain(m);
    const result = () => {
      state.calls.push(call);
      if (table === "access_codes" && call.op === "select") return { data: { email: state.email, companies: { name: "Lakeview", source: "open" } }, error: null };
      if (table === "access_codes" && call.op === "update") return { data: state.emailUpdated ? [{ code: "C" }] : [], error: null };
      if (table === "events" && call.op === "select") return { data: null, error: null, count: 0 };
      return { data: null, error: null };
    };
    q.maybeSingle = () => Promise.resolve(result());
    q.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, ko);
    return q;
  }
  return { db: () => ({ from }), must: (r: { data: unknown; error: { message: string } | null }) => r.data };
});

const { sendResumeEmail } = await import("./email");

describe('"Save and finish later": correo con consentimiento', () => {
  beforeEach(() => {
    state.calls = [];
    state.email = null;
    state.emailUpdated = true;
    vi.stubEnv("RESEND_API_KEY", ""); // el correo se imprime en lugar de enviarse
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("sin correo en el código, lo pide", async () => {
    expect(await sendResumeEmail("C", "https://x.test", null, "en")).toEqual({ status: "needEmail" });
    expect(state.calls.some((c) => c.op === "update")).toBe(false);
  });

  it("guarda el correo escrito con la fecha y la versión del consentimiento, solo si estaba vacío, y registra email_captured", async () => {
    const before = Date.now();
    const res = await sendResumeEmail("C", "https://x.test", "jane@lakeview.com", "en");
    expect(res).toEqual({ status: "sent", to: "j•••@lakeview.com" });

    const update = state.calls.find((c) => c.table === "access_codes" && c.op === "update")!;
    const p = update.payload as { email: string; email_consent_at: string; email_consent_version: string };
    expect(p.email).toBe("jane@lakeview.com");
    expect(p.email_consent_version).toBe(EMAIL_CONSENT_VERSION);
    expect(new Date(p.email_consent_at).getTime()).toBeGreaterThanOrEqual(before);
    expect(update.filters).toContainEqual(["is", "email", null]); // nunca reemplaza un correo existente

    const captured = state.calls.find((c) => c.table === "events" && c.op === "insert" && (c.payload as { type: string }).type === "email_captured");
    expect(captured?.payload).toMatchObject({ code: "C", payload: { from: "later", open: true, consent: EMAIL_CONSENT_VERSION } });
  });

  it("si otro pedido guardó un correo antes, no registra email_captured", async () => {
    state.emailUpdated = false;
    await sendResumeEmail("C", "https://x.test", "jane@lakeview.com", "en");
    expect(state.calls.some((c) => c.table === "events" && (c.payload as { type?: string } | undefined)?.type === "email_captured")).toBe(false);
  });

  it("con correo ya registrado, no escribe nada en access_codes", async () => {
    state.email = "owner@lakeview.com";
    expect(await sendResumeEmail("C", "https://x.test", "otro@lakeview.com", "en")).toEqual({ status: "sent", to: "o•••@lakeview.com" });
    expect(state.calls.some((c) => c.table === "access_codes" && c.op === "update")).toBe(false);
  });
});
