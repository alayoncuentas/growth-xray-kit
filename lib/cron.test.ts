import { describe, expect, it } from "vitest";
import { bearerOk } from "./cron";

const secret = "s3cret-for-the-daily-cleanup";

describe("bearerOk (CRON_SECRET)", () => {
  it("acepta solo Bearer con el secreto exacto", () => {
    expect(bearerOk(`Bearer ${secret}`, secret)).toBe(true);
    for (const h of [null, undefined, "", secret, `bearer ${secret}`, `Bearer ${secret} `, `Bearer ${secret}x`, "Bearer ", `Basic ${secret}`]) {
      expect(bearerOk(h, secret)).toBe(false);
    }
  });

  it("sin secreto configurado, o con uno corto, nunca pasa", () => {
    expect(bearerOk("Bearer ", "")).toBe(false);
    expect(bearerOk("Bearer undefined", undefined)).toBe(false);
    expect(bearerOk("Bearer short", "short")).toBe(false);
  });
});
