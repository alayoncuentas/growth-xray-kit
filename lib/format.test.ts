import { describe, expect, it } from "vitest";
import { FIGURE_GLYPH_EM, figureFontSize, figurePx } from "./format";
import { usd } from "./config";

describe("cifra grande en una línea", () => {
  it("la cifra más larga posible ($63,000,000) cabe en ~328 px (pantalla de 400 px)", () => {
    const text = usd(63_000_000);
    expect(text).toBe("$63,000,000");
    const px = figurePx(text, 328);
    expect(px).toBeLessThan(72);
    expect(px * FIGURE_GLYPH_EM * text.length).toBeLessThanOrEqual(328);
  });

  it("las cifras cortas llegan al tope", () => {
    expect(figurePx("$9,000", 328)).toBe(72);
    expect(figurePx("$0", 328, 64)).toBe(64);
  });

  it("en CSS: tope en px y el resto relativo al contenedor", () => {
    expect(figureFontSize("$63,000,000")).toBe("min(72px, 13.77cqi)");
    expect(figureFontSize("$9,000", 56)).toMatch(/^min\(56px, [\d.]+cqi\)$/);
  });
});
