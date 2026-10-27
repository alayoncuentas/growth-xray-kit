import { describe, expect, it } from "vitest";
import { buildEmail, maskEmail, normalizeEmail } from "./email";

describe("buildEmail", () => {
  const v = { code: "K7MPX-4RHQ2", business: "Rivera Dental Studio", link: "https://xray.example.com/r/K7MPX-4RHQ2", lang: "en" as const };

  it("informe: asunto, link, negocio y pie con el código", () => {
    const e = buildEmail("report", v);
    expect(e.subject).toBe("Your Growth X-Ray results");
    expect(e.text).toContain("Thanks for finishing Phase 1 for Rivera Dental Studio.");
    expect(e.text).toContain(v.link);
    expect(e.text).toContain("access code K7MPX-4RHQ2");
    expect(e.html).toContain(`href="${v.link}"`);
  });

  it("retomar: sin negocio no deja huecos", () => {
    const e = buildEmail("resume", { ...v, business: null, link: "https://xray.example.com/x/K7MPX-4RHQ2" });
    expect(e.text.startsWith("Your answers are saved.")).toBe(true);
    expect(e.html).toContain("/x/K7MPX-4RHQ2");
  });

  it("en español: textos del config en español y <html lang=es>", () => {
    const r = buildEmail("report", { ...v, lang: "es" });
    expect(r.subject).toBe("Tus resultados de Growth X-Ray");
    expect(r.text).toContain("Gracias por terminar la fase 1 del diagnóstico de Rivera Dental Studio.");
    expect(r.text).toContain("código de acceso K7MPX-4RHQ2");
    expect(r.html).toContain('<html lang="es">');
    const s = buildEmail("resume", { ...v, lang: "es", business: null });
    expect(s.text.startsWith("Tus respuestas del diagnóstico están guardadas.")).toBe(true);
  });

  it("escapa HTML en los datos", () => {
    const e = buildEmail("report", { ...v, business: 'A&B <script>"x"</script>' });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("A&amp;B &lt;script&gt;");
  });

  it("sin lenguaje de venta agresivo", () => {
    for (const k of ["report", "resume"] as const) {
      expect(buildEmail(k, v).text).not.toMatch(/limited time|act now|don't miss|hurry|exclusive offer|!/i);
      expect(buildEmail(k, { ...v, lang: "es" }).text).not.toMatch(/tiempo limitado|no te pierdas|apúrate|oferta exclusiva|!/i);
    }
  });

  it("camino abierto: el código solo aparece dentro del link, en los dos idiomas", () => {
    for (const lang of ["en", "es"] as const) {
      for (const kind of ["report", "resume"] as const) {
        const link = `https://xray.example.com/${kind === "report" ? "r" : "x"}/K7MPX-4RHQ2`;
        const e = buildEmail(kind, { ...v, lang, link, open: true });
        expect(e.text.replaceAll(link, "")).not.toContain("K7MPX-4RHQ2");
        expect(e.html.replaceAll(link, "")).not.toContain("K7MPX-4RHQ2");
      }
    }
    expect(buildEmail("resume", { ...v, open: true }).text).toContain("No rush. The link stays the same.");
  });
});

describe("maskEmail", () => {
  it("deja la inicial y el dominio", () => {
    expect(maskEmail("jane.doe@rivera.com")).toBe("j•••@rivera.com");
    expect(maskEmail("bad")).toBe("•••");
  });
});

describe("normalizeEmail", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(normalizeEmail("  Jane.Doe@Rivera.COM ")).toBe("jane.doe@rivera.com");
  });

  it("rechaza lo que no es un correo", () => {
    for (const v of ["", "   ", "jane", "jane@", "@rivera.com", "jane@rivera", "ja ne@rivera.com", "a@b.c" + "x".repeat(260), null, 42]) {
      expect(normalizeEmail(v)).toBeNull();
    }
  });
});

describe("línea del regalo en el informe", () => {
  const v = { code: "K7MPX-4RHQ2", business: null, link: "https://xray.example.com/r/K7MPX-4RHQ2", lang: "en" as const, open: true };

  it("el informe nombra el regalo ofrecido, en los dos idiomas", () => {
    const a = buildEmail("report", { ...v, gift: "A" });
    expect(a.text).toContain("Your free extra: Free response-time test + website review. We'll email you separately to set it up.");
    expect(a.html).toContain("Your free extra: Free response-time test + website review.");
    expect(buildEmail("report", { ...v, gift: "B", lang: "es" }).text).toContain("Tu extra gratis: Auditoría gratis de tus reseñas de Google.");
  });

  it("sin regalo, o en el correo para retomar, no hay línea", () => {
    expect(buildEmail("report", v).text).not.toContain("free extra");
    expect(buildEmail("resume", { ...v, gift: "A" }).text).not.toContain("free extra");
  });
});
