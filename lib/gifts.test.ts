import { describe, expect, it } from "vitest";
import { getConfig } from "./config";
import { addBusinessDays, businessDaysLeft, giftFor, giftForAnswers, isOverdue } from "./gifts";
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

describe("plazos en días hábiles (America/New_York, lunes a viernes)", () => {
  const at = (iso: string) => new Date(iso);

  it("martes + 3 → vence al terminar el viernes (medianoche de Nueva York, con horario de verano)", () => {
    // Martes 27 de octubre de 2026, 10:00 en Nueva York (EDT, UTC−4).
    expect(addBusinessDays(at("2026-10-27T14:00:00Z"), 3).toISOString()).toBe("2026-10-31T04:00:00.000Z");
    expect(addBusinessDays(at("2026-10-27T14:00:00Z"), 2).toISOString()).toBe("2026-10-30T04:00:00.000Z");
  });

  it("el fin de semana no cuenta y el cambio de horario (1 de noviembre) se respeta", () => {
    // Viernes 30 de octubre → lunes, martes, miércoles 4 de noviembre; vence a medianoche EST (UTC−5).
    expect(addBusinessDays(at("2026-10-30T15:00:00Z"), 3).toISOString()).toBe("2026-11-05T05:00:00.000Z");
    // Sábado → lunes y martes.
    expect(addBusinessDays(at("2026-10-31T15:00:00Z"), 2).toISOString()).toBe("2026-11-04T05:00:00.000Z");
  });

  it("cuenta el día civil de Nueva York, no el de UTC", () => {
    // Viernes 23:30 en Nueva York ya es sábado en UTC: sigue siendo viernes.
    expect(addBusinessDays(at("2026-10-31T03:30:00Z"), 2).toISOString()).toBe("2026-11-04T05:00:00.000Z");
  });

  it("días que quedan: hoy cuenta si es hábil; el fin de semana no; 0 al vencer", () => {
    const due = at("2026-10-31T04:00:00Z"); // termina el viernes 30
    expect(businessDaysLeft(due, at("2026-10-27T14:00:00Z"))).toBe(4); // martes: mar, mié, jue, vie
    expect(businessDaysLeft(due, at("2026-10-30T20:00:00Z"))).toBe(1); // viernes por la tarde
    expect(businessDaysLeft(due, at("2026-10-31T04:00:00Z"))).toBe(0);
    expect(isOverdue(due, at("2026-10-31T03:59:59Z"))).toBe(false);
    expect(isOverdue(due, at("2026-10-31T04:00:00Z"))).toBe(true);
    // Vence el lunes; desde el sábado queda 1 (el lunes).
    expect(businessDaysLeft(at("2026-11-03T05:00:00Z"), at("2026-10-31T15:00:00Z"))).toBe(1);
  });

  it("los plazos están en el config: A en 3 días, B en 2, iguales en los dos idiomas", () => {
    for (const lang of ["en", "es"] as const) {
      expect(getConfig(lang).copy.gifts.A.days).toBe(3);
      expect(getConfig(lang).copy.gifts.B.days).toBe(2);
    }
  });
});
