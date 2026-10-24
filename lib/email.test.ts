import { describe, expect, it } from "vitest";
import { buildEmail, maskEmail } from "./email";

describe("buildEmail", () => {
  const v = { code: "K7MPX-4RHQ2", business: "Rivera Dental Studio", link: "https://xray.example.com/r/K7MPX-4RHQ2" };

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

  it("escapa HTML en los datos", () => {
    const e = buildEmail("report", { ...v, business: 'A&B <script>"x"</script>' });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("A&amp;B &lt;script&gt;");
  });

  it("sin lenguaje de venta agresivo", () => {
    for (const k of ["report", "resume"] as const) {
      expect(buildEmail(k, v).text).not.toMatch(/limited time|act now|don't miss|hurry|exclusive offer|!/i);
    }
  });
});

describe("maskEmail", () => {
  it("deja la inicial y el dominio", () => {
    expect(maskEmail("jane.doe@rivera.com")).toBe("j•••@rivera.com");
    expect(maskEmail("bad")).toBe("•••");
  });
});
