import { beforeEach, describe, expect, it, vi } from "vitest";

// GET /api/cron/cleanup con la base simulada: sin el secreto no llama a la base; con él, llama a cleanup_expired.

vi.mock("server-only", () => ({}));
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/db", () => ({ db: () => ({ rpc }) }));

const { GET } = await import("@/app/api/cron/cleanup/route");
const SECRET = "s3cret-for-the-daily-cleanup";
const call = (auth?: string) => GET(new Request("https://x.test/api/cron/cleanup", { headers: auth ? { authorization: auth } : {} }));

describe("cron de borrado", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("401 sin el secreto, sin tocar la base", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer otro-secreto-cualquiera")).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("con el secreto llama a cleanup_expired y devuelve lo borrado", async () => {
    rpc.mockResolvedValue({ data: { companies: 2, access_attempts: 5, open_starts: 1 }, error: null });
    const res = await call(`Bearer ${SECRET}`);
    expect(rpc).toHaveBeenCalledWith("cleanup_expired");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, deleted: { companies: 2, access_attempts: 5, open_starts: 1 } });
  });

  it("500 si la función falla", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await call(`Bearer ${SECRET}`)).status).toBe(500);
  });
});
