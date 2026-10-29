import { describe, expect, it } from "vitest";
import en from "@/config/phase1.config.json";
import es from "@/config/phase1.config.es.json";
import { getConfig, langFromAcceptLanguage, LANGS } from "./config";

// Los dos idiomas deben tener exactamente la misma estructura: mismas claves, mismos ids, opciones, puntajes,
// valores, evidencia (fuente y url) y reglas. Solo cambian los textos. Si este test falla, el config en español
// se desalineó del inglés (o al revés).

/** Claves cuyo valor (texto o lista de textos) no se traduce: ids, referencias, fuentes y urls. */
const FIXED = new Set(["id", "version", "type", "section", "kind", "evidence", "myth", "flag", "unit", "url", "source", "brand", "signoff", "placeholder", "default", "maxFrom", "options", "en", "es"]);
/** Excepciones: con el mismo nombre de clave, estos sí son textos traducibles. */
const TEXT = [/^myths\.\w+\.myth$/, /^copy\.insight\.source$/];

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/** Diferencias de estructura entre a y b (vacía si coinciden). */
function diff(a: Json, b: Json, path = "", fixed = false): string[] {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return [`${path}: lista en un idioma y no en el otro`];
    if (a.length !== b.length) return [`${path}: ${a.length} elementos en inglés y ${b.length} en español`];
    return a.flatMap((x, i) => diff(x, b[i], `${path}[${i}]`, fixed));
  }
  if (a !== null && typeof a === "object") {
    if (b === null || typeof b !== "object") return [`${path}: objeto en un idioma y no en el otro`];
    const ka = Object.keys(a).sort().join(",");
    const kb = Object.keys(b).sort().join(",");
    if (ka !== kb) return [`${path}: claves distintas (en: ${ka} · es: ${kb})`];
    return Object.keys(a).flatMap((k) => {
      const p = path ? `${path}.${k}` : k;
      return diff(a[k], b[k], p, FIXED.has(k) && !TEXT.some((r) => r.test(p)));
    });
  }
  if (typeof a !== typeof b) return [`${path}: tipo distinto`];
  if (typeof a !== "string") return a === b ? [] : [`${path}: ${String(a)} ≠ ${String(b)}`];
  if (fixed) return a === b ? [] : [`${path}: debe ser igual en los dos idiomas ("${a}" ≠ "${b}")`];
  // Texto traducible: los mismos {marcadores} y las mismas **negritas**.
  const marks = (s: string) => JSON.stringify([...(s.match(/\{\w+\}/g) ?? [])].sort());
  const bolds = (s: string) => (s.match(/\*\*/g) ?? []).length;
  const out: string[] = [];
  if (marks(a) !== marks(b as string)) out.push(`${path}: marcadores distintos (${marks(a)} ≠ ${marks(b as string)})`);
  if (bolds(a) !== bolds(b as string)) out.push(`${path}: negritas distintas`);
  return out;
}

describe("config en / es", () => {
  it("misma estructura: ids, opciones, puntajes, valores y evidencia", () => {
    expect(diff(en as unknown as Json, es as unknown as Json)).toEqual([]);
  });

  it("el test detecta una opción que falta, un puntaje distinto o un marcador perdido", () => {
    const copy = () => JSON.parse(JSON.stringify(es));
    const sinOpcion = copy();
    sinOpcion.questions[3].options.pop();
    expect(diff(en as unknown as Json, sinOpcion).length).toBeGreaterThan(0);
    const otroPuntaje = copy();
    otroPuntaje.questions[3].options[0].scores.access = 1;
    expect(diff(en as unknown as Json, otroPuntaje).length).toBeGreaterThan(0);
    const otroId = copy();
    otroId.questions[3].options[0].id = "z";
    expect(diff(en as unknown as Json, otroId)).toEqual([expect.stringContaining("questions[3].options[0].id")]);
    const otraFuente = copy();
    otraFuente.evidence.hbr2011.source = "Harvard Business Review (traducido)";
    expect(diff(en as unknown as Json, otraFuente).length).toBe(1);
    const otraRegla = copy();
    otraRegla.questions[6].insight.when.options = ["paper"];
    expect(diff(en as unknown as Json, otraRegla).length).toBe(1);
    const sinMarcador = copy();
    sinMarcador.copy.preparedFor = "Preparado";
    expect(diff(en as unknown as Json, sinMarcador).length).toBeGreaterThan(0);
  });

  it("los textos sí están traducidos", () => {
    const es1 = getConfig("es");
    expect(es1.questions[0].prompt).not.toBe(getConfig("en").questions[0].prompt);
    expect(es1.copy.gate.title).not.toBe(getConfig("en").copy.gate.title);
    // Las fuentes de las estadísticas quedan en su idioma original.
    for (const k of Object.keys(es1.evidence)) expect(es1.evidence[k].source).toBe(getConfig("en").evidence[k].source);
  });

  it("calculadora: los valores iniciales por tamaño usan los ids de la pregunta de equipo", () => {
    for (const l of LANGS) {
      const c = getConfig(l);
      const team = c.questions.find((q) => q.id === "team");
      const ids = team && team.type !== "calculator" ? team.options.map((o) => o.id).sort() : [];
      for (const q of c.questions) {
        if (q.type !== "calculator") continue;
        for (const f of q.fields) if (f.bySize) expect(Object.keys(f.bySize).sort(), `${l}.${f.id}`).toEqual(ids);
      }
    }
  });

  it("getConfig devuelve cada idioma", () => {
    for (const l of LANGS) expect(getConfig(l).questions.length).toBe(getConfig("en").questions.length);
  });
});

describe("idioma del navegador (Accept-Language)", () => {
  it("elige el de mayor preferencia entre en y es", () => {
    expect(langFromAcceptLanguage("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(langFromAcceptLanguage("en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(langFromAcceptLanguage("fr-FR,fr;q=0.9,es;q=0.7,en;q=0.5")).toBe("es");
    expect(langFromAcceptLanguage("en;q=0.3, ES-419;q=0.6")).toBe("es");
  });

  it("null si no trae ninguno de los dos, o no hay encabezado", () => {
    expect(langFromAcceptLanguage("fr-FR,de;q=0.8")).toBeNull();
    expect(langFromAcceptLanguage("es;q=0")).toBeNull();
    expect(langFromAcceptLanguage("*")).toBeNull();
    expect(langFromAcceptLanguage("")).toBeNull();
    expect(langFromAcceptLanguage(null)).toBeNull();
  });
});
