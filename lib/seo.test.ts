import { describe, expect, it } from "vitest";
import { isTestDeploy } from "./seo";

describe("entorno de pruebas sin indexar", () => {
  it("solo si NEXT_PUBLIC_APP_URL contiene xray-test", () => {
    expect(isTestDeploy("https://xray-test.123spice.com")).toBe(true);
    expect(isTestDeploy("https://XRAY-TEST.123spice.com/")).toBe(true);
    for (const v of ["https://xray.123spice.com", "http://localhost:3000", "", undefined, null]) expect(isTestDeploy(v)).toBe(false);
  });
});
