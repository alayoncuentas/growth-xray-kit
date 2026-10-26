import { describe, expect, it } from "vitest";
import { cleanReferrer, isOpenEntryEnabled, openLimitReached, parseUtm, turnstileOk } from "./open-entry";

describe("flag OPEN_ENTRY_ENABLED", () => {
  const dev = { production: false, hasSalt: false };
  it("solo se enciende con \"true\"", () => {
    expect(isOpenEntryEnabled("true", dev)).toBe(true);
    for (const v of [undefined, "", "false", "1", "TRUE", "yes", " true"]) expect(isOpenEntryEnabled(v, dev)).toBe(false);
  });

  it("en producción exige IP_HASH_SALT", () => {
    expect(isOpenEntryEnabled("true", { production: true, hasSalt: false })).toBe(false);
    expect(isOpenEntryEnabled("true", { production: true, hasSalt: true })).toBe(true);
  });
});

describe("límite por IP", () => {
  it("5 por hora y 20 por día", () => {
    expect(openLimitReached(4, 19)).toBe(false);
    expect(openLimitReached(5, 5)).toBe(true);
    expect(openLimitReached(0, 20)).toBe(true);
  });
});

describe("UTM", () => {
  it("toma solo las 5 claves, sin vacíos, recortadas", () => {
    const p = new URLSearchParams("utm_source=google&utm_medium=cpc&utm_campaign=%20spring%20&utm_term=&gclid=x&utm_content=" + "a".repeat(300));
    expect(parseUtm((k) => p.get(k))).toEqual({ utm_source: "google", utm_medium: "cpc", utm_campaign: "spring", utm_content: "a".repeat(200) });
  });

  it("null si no hay ninguna", () => {
    expect(parseUtm((k) => new URLSearchParams("ref=abc").get(k))).toBeNull();
  });
});

describe("referrer", () => {
  it("guarda el externo y descarta el propio sitio", () => {
    expect(cleanReferrer("https://www.google.com/", "xray.123spice.com")).toBe("https://www.google.com/");
    expect(cleanReferrer("https://xray.123spice.com/x/ABC", "xray.123spice.com")).toBeNull();
    expect(cleanReferrer("https://XRAY.123spice.com/", "xray.123spice.com")).toBeNull();
  });

  it("descarta lo que no es una URL http(s)", () => {
    for (const v of ["", null, "nada", "javascript:alert(1)", "android-app://com.google.android.gm/"]) {
      expect(cleanReferrer(v, "xray.123spice.com")).toBeNull();
    }
  });
});

describe("respuesta de Turnstile", () => {
  const ok = { success: true, action: "start", hostname: "xray.123spice.com" };
  it("acepta la del inicio en el host esperado", () => {
    expect(turnstileOk(ok, "xray.123spice.com")).toBe(true);
    expect(turnstileOk({ success: true, hostname: "example.com" }, null)).toBe(true); // claves de prueba, en local
  });

  it("rechaza un fallo, otra acción u otro host", () => {
    expect(turnstileOk({ ...ok, success: false }, "xray.123spice.com")).toBe(false);
    expect(turnstileOk({ ...ok, action: "login" }, "xray.123spice.com")).toBe(false);
    expect(turnstileOk({ ...ok, hostname: "evil.example" }, "xray.123spice.com")).toBe(false);
    expect(turnstileOk({ success: true, hostname: "xray.123spice.com" }, "xray.123spice.com")).toBe(false); // sin acción
    expect(turnstileOk({}, null)).toBe(false);
  });
});
