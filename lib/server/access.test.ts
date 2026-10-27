import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./db", () => ({ db: () => ({}), must: (r: { data: unknown }) => r.data }));
vi.mock("./auth", () => ({ getAdmin: async () => null }));

const { toCompany } = await import("./access");

const base = { name: "Lakeview", city: "Austin", state: "TX", industry: "dental", website: null, outside_view: null };

describe("rubro conocido", () => {
  it("una empresa invitada trae su rubro: la pregunta de rubro no se muestra", () => {
    expect(toCompany({ ...base, source: "invited" }).industry).toBe("dental");
    expect(toCompany({ ...base }).industry).toBe("dental"); // sin la migración: invitada
  });

  it("en el camino abierto el rubro copiado no cuenta como conocido: la pregunta se sigue mostrando", () => {
    expect(toCompany({ ...base, source: "open" }).industry).toBeUndefined();
  });
});
