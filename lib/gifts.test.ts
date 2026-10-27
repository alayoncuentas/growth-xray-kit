import { describe, expect, it } from "vitest";
import { getConfig } from "./config";
import { giftFor, giftForAnswers } from "./gifts";
import { sampleState } from "./preview";

describe("regalo según calificación", () => {
  it("A con Potential ≥ 60 y Need ≥ 50; B el resto (bordes incluidos)", () => {
    expect(giftFor({ potential: 60, need: 50 })).toBe("A");
    expect(giftFor({ potential: 100, need: 100 })).toBe("A");
    expect(giftFor({ potential: 59, need: 100 })).toBe("B");
    expect(giftFor({ potential: 100, need: 49 })).toBe("B");
    expect(giftFor({ potential: 0, need: 0 })).toBe("B");
  });

  it("se calcula con las respuestas y no depende del idioma", () => {
    const answers = { industry: "home", team: "1" };
    expect(giftForAnswers(getConfig("en"), answers, {})).toBe(giftForAnswers(getConfig("es"), answers, {}));
    // Muestras de /admin/preview: "leaky" (mucho volumen y fugas) califica para A; "ready" (sistema sólido), para B.
    const leaky = sampleState("leaky");
    const ready = sampleState("ready");
    expect(giftForAnswers(getConfig("en"), leaky.answers, leaky.calc)).toBe("A");
    expect(giftForAnswers(getConfig("en"), ready.answers, ready.calc)).toBe("B");
    // Sin respuestas: Potential bajo → B.
    expect(giftForAnswers(getConfig("en"), {}, {})).toBe("B");
  });
});
