import { describe, expect, it } from "vitest";
import { arrivalFrom, cleanReferrer, isOpenEntryEnabled, normalizeWebsite, openLimitReached, parseBusinessForm, parseUtm, turnstileOk } from "./open-entry";

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

  const fromQuery = (q: string) => parseUtm((k) => new URLSearchParams(q).get(k));

  it("presentes: las de la URL de llegada", () => {
    expect(fromQuery("utm_source=test&utm_medium=manual&utm_campaign=prueba1")).toEqual({
      utm_source: "test",
      utm_medium: "manual",
      utm_campaign: "prueba1",
    });
  });

  it("ausentes: vacías, de puros espacios o de puros caracteres de control dan null", () => {
    expect(fromQuery("")).toBeNull();
    expect(fromQuery("utm_source=&utm_medium=%20%20&utm_campaign=%00%0A")).toBeNull();
    expect(parseUtm(() => undefined)).toBeNull();
  });

  it("demasiado largas: 200 caracteres sin partir un emoji", () => {
    const utm = fromQuery("utm_source=" + "x".repeat(199) + "%F0%9F%98%80" + "y".repeat(50));
    expect(utm?.utm_source).toBe("x".repeat(199) + "😀");
    expect(Array.from(utm!.utm_source!)).toHaveLength(200);
    expect(JSON.stringify(utm)).not.toMatch(/\\ud[89ab][0-9a-f]{2}"/i); // sin surrogate suelto (jsonb lo rechaza)
  });

  it("caracteres raros: quita los de control y conserva el resto, decodificado", () => {
    expect(fromQuery("utm_source=a%00b%09c&utm_medium=%3Cscript%3E%22%27&utm_campaign=promo%20oto%C3%B1o%20%F0%9F%8D%82&utm_term=%E2%80%AEx")).toEqual({
      utm_source: "abc",
      utm_medium: "<script>\"'",
      utm_campaign: "promo otoño 🍂",
      utm_term: "‮x",
    });
  });
});

describe("primer contacto al iniciar (arrivalFrom)", () => {
  const form = (q: string) => (k: string) => new URLSearchParams(q).get(k);
  const host = "localhost:3000";

  it("usa los campos del formulario", () => {
    const a = arrivalFrom(form("utm_source=test&utm_medium=manual&referrer=https%3A%2F%2Fwww.google.com%2F"), null, host);
    expect(a).toEqual({ utm: { utm_source: "test", utm_medium: "manual" }, referrer: "https://www.google.com/" });
  });

  it("si el formulario no trae UTM, los toma de la página (Referer de la acción)", () => {
    const a = arrivalFrom(form(""), "http://localhost:3000/?utm_source=test&utm_medium=manual&utm_campaign=prueba1", host);
    expect(a).toEqual({ utm: { utm_source: "test", utm_medium: "manual", utm_campaign: "prueba1" }, referrer: null });
  });

  it("el formulario tiene prioridad sobre el Referer", () => {
    expect(arrivalFrom(form("utm_source=form"), "http://localhost:3000/?utm_source=page", host).utm).toEqual({ utm_source: "form" });
  });

  it("un Referer de otro sitio, inválido o sin UTM no aporta nada", () => {
    expect(arrivalFrom(form(""), "https://evil.example/?utm_source=x", host).utm).toBeNull();
    expect(arrivalFrom(form(""), "nada", host).utm).toBeNull();
    expect(arrivalFrom(form(""), "http://localhost:3000/", host).utm).toBeNull();
    expect(arrivalFrom(form(""), "http://localhost:3000/?utm_source=x", null).utm).toBeNull();
  });
});

describe("referrer", () => {
  it("guarda el externo y descarta el propio sitio", () => {
    expect(cleanReferrer("https://www.google.com/", "xray.123spice.com")).toBe("https://www.google.com/");
    expect(cleanReferrer("https://xray.123spice.com/x/ABC", "xray.123spice.com")).toBeNull();
    expect(cleanReferrer("https://XRAY.123spice.com/", "xray.123spice.com")).toBeNull();
  });

  it("recorta a 500 caracteres y nunca deja caracteres de control", () => {
    const r = cleanReferrer("https://example.com/" + "p".repeat(600), "xray.123spice.com");
    expect(r).toHaveLength(500);
    expect(cleanReferrer("https://example.com/a\u0000b", "xray.123spice.com")).not.toMatch(/\p{Cc}/u);
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

describe("web del negocio", () => {
  it("normaliza a https://dominio[/ruta]", () => {
    expect(normalizeWebsite("lakeviewplumbing.com")).toBe("https://lakeviewplumbing.com");
    expect(normalizeWebsite("  WWW.Lakeview-Plumbing.com/  ")).toBe("https://www.lakeview-plumbing.com");
    expect(normalizeWebsite("http://lakeview.co.uk/contact/")).toBe("https://lakeview.co.uk/contact");
    expect(normalizeWebsite("https://plomeria.mx/es?x=1")).toBe("https://plomeria.mx/es");
  });

  it("vacía es null; lo que no es un sitio es invalid", () => {
    expect(normalizeWebsite("   ")).toBeNull();
    for (const v of ["lakeview", "javascript:alert(1)", "ftp://a.com", "https://user:pw@a.com", "a.com:8080", "lake view.com", "-a.com", "a..com", "a.c"]) {
      expect(normalizeWebsite(v)).toBe("invalid");
    }
  });
});

describe("datos del negocio", () => {
  it("nombre obligatorio, con espacios colapsados y hasta 120 caracteres", () => {
    expect(parseBusinessForm({ name: "  Lakeview   Plumbing ", website: "" })).toEqual({ ok: true, name: "Lakeview Plumbing", website: null });
    const long = parseBusinessForm({ name: "x".repeat(300), website: null });
    expect(long.ok && long.name.length).toBe(120);
  });

  it("devuelve los errores y lo que escribió la persona", () => {
    expect(parseBusinessForm({ name: "  ", website: "nope" })).toEqual({ ok: false, errors: { name: true, website: true }, name: "  ", website: "nope" });
    expect(parseBusinessForm({ name: null, website: undefined })).toMatchObject({ ok: false, errors: { name: true } });
  });
});
