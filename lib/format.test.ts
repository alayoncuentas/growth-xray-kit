import { describe, expect, it } from "vitest";
import { approx, FIGURE_GLYPH_EM, figureFontSize, figurePx } from "./format";
import { usd } from "./config";

describe("cifra grande en una línea", () => {
  // Ancho del contenedor de la cifra: pantalla − 2 × 16 px de margen − 2 × 18 px de relleno de la sección.
  it.each([
    [320, 252],
    [400, 332],
  ])("la cifra más larga posible ($650,000,000) cabe en una pantalla de %i px (%i px de contenedor)", (_screen, width) => {
    const text = usd(650_000_000);
    expect(text).toBe("$650,000,000");
    const px = figurePx(text, width);
    expect(px).toBeLessThan(72);
    expect(px * FIGURE_GLYPH_EM * text.length).toBeLessThanOrEqual(width);
  });

  it("las cifras cortas llegan al tope", () => {
    expect(figurePx("$9,000", 328)).toBe(72);
    expect(figurePx("$0", 328, 64)).toBe(64);
  });

  it("en CSS: tope en px y el resto relativo al contenedor", () => {
    expect(figureFontSize("$63,000,000")).toBe("min(72px, 15.15cqi)");
    expect(figureFontSize("$9,000", 56)).toMatch(/^min\(56px, [\d.]+cqi\)$/);
  });
});

describe("approx", () => {
  it("un decimal por debajo de 10, entero desde ahí, con formato de EE. UU.", () => {
    expect(approx(0.25)).toBe("0.3");
    expect(approx(3)).toBe("3");
    expect(approx(18)).toBe("18");
    expect(approx(43.2)).toBe("43");
    expect(approx(1750)).toBe("1,750");
  });
});
