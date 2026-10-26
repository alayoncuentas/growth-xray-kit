import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, funnel, generateCode, isAllowedEmail, parseCompanyForm, toCsv } from "./admin";

describe("generateCode", () => {
  it("10 símbolos sin ambiguos, en formato XXXXX-XXXXX", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/);
      expect(c).toMatch(/^[A-Z0-9-]{6,32}$/); // lo acepta checkAccess
    }
  });

  it("el alfabeto es base32 sin 0, 1, I ni O", () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    expect(new Set(CODE_ALPHABET).size).toBe(32);
    expect(CODE_ALPHABET).not.toMatch(/[01IO]/);
  });

  it("usa todos los símbolos (sin sesgo por módulo)", () => {
    const bytes = Uint8Array.from({ length: 10 }, (_, i) => i * 32 + i); // byte % 32 === i
    expect(generateCode(() => bytes)).toBe("23456-789AB");
    expect(generateCode(() => new Uint8Array(10).fill(255))).toBe("ZZZZZ-ZZZZZ");
  });
});

describe("funnel", () => {
  it("acumula: cada estado cuenta también en los anteriores", () => {
    const f = funnel(["sent", "sent", "opened", "p1_done", "booked"]);
    expect(f.map((s) => s.count)).toEqual([5, 3, 2, 1, 1]);
    expect(f.map((s) => s.pct)).toEqual([100, 60, 40, 20, 20]);
  });
  it("sin códigos: ceros", () => {
    expect(funnel([]).every((s) => s.count === 0 && s.pct === 0)).toBe(true);
  });
});

describe("toCsv", () => {
  it("encabezado, comillas y saltos de línea CRLF", () => {
    const csv = toCsv([{ a: 'Rivera "Dental", LLC', b: null }], ["a", "b"]);
    expect(csv).toBe('a,b\r\n"Rivera ""Dental"", LLC",\r\n');
  });
  it("neutraliza fórmulas pero deja teléfonos", () => {
    const csv = toCsv([{ x: "=HYPERLINK(1)" }, { x: "@SUM(A1)" }, { x: "+1 512 555 0100" }, { x: "-cmd" }], ["x"]);
    expect(csv.split("\r\n").slice(1, 5)).toEqual(["'=HYPERLINK(1)", "'@SUM(A1)", "+1 512 555 0100", "'-cmd"]);
  });
});

describe("parseCompanyForm", () => {
  const industries = ["dental", "home"];
  const form = (o: Record<string, string>) => (k: string) => o[k];

  it("normaliza un formulario válido", () => {
    const r = parseCompanyForm(
      form({ name: " Rivera Dental ", state: "tx", website: "riveradental.com", email: "Ana@Rivera.com", industry: "dental", expiresDays: "60" }),
      industries,
    );
    expect(r).toEqual({
      ok: true,
      data: expect.objectContaining({ name: "Rivera Dental", state: "TX", website: "https://riveradental.com/", email: "ana@rivera.com", expiresDays: 60, outside_view: null }),
    });
  });

  it("idioma del link: inglés por defecto, español si se elige", () => {
    const base = { name: "A" };
    const def = parseCompanyForm(form(base), industries);
    const sp = parseCompanyForm(form({ ...base, lang: "es" }), industries);
    const bad = parseCompanyForm(form({ ...base, lang: "fr" }), industries);
    expect(def.ok && def.data.lang).toBe("en");
    expect(sp.ok && sp.data.lang).toBe("es");
    expect(bad.ok && bad.data.lang).toBe("en");
  });

  it("errores por campo", () => {
    const r = parseCompanyForm(form({ state: "Texas", website: "nope", email: "x@", industry: "zzz", expiresDays: "7" }), industries);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "expiresDays", "industry", "name", "state", "website"]);
  });

  it("vista externa: todo o nada", () => {
    const some = parseCompanyForm(form({ name: "A", outside_date: "Tue, Oct 13" }), industries);
    expect(some.ok ? null : some.errors.outside).toBeTruthy();
    const all = parseCompanyForm(
      form({ name: "A", outside_date: "d", outside_text: "t", outside_reply: "r", outside_replyGap: "g", outside_reviews: "v", outside_lastReview: "l" }),
      industries,
    );
    expect(all.ok && all.data.outside_view).toEqual({ date: "d", text: "t", reply: "r", replyGap: "g", reviews: "v", lastReview: "l" });
  });

  it("sin vencimiento", () => {
    const r = parseCompanyForm(form({ name: "A", expiresDays: "never" }), industries);
    expect(r.ok && r.data.expiresDays).toBeNull();
  });
});

describe("isAllowedEmail", () => {
  it("compara sin mayúsculas ni espacios, con lista separada por comas", () => {
    expect(isAllowedEmail("Owner@Example.com", " owner@example.com , b@x.com")).toBe(true);
    expect(isAllowedEmail("other@example.com", "owner@example.com")).toBe(false);
    expect(isAllowedEmail("owner@example.com", undefined)).toBe(false);
    expect(isAllowedEmail(null, "owner@example.com")).toBe(false);
  });
});
