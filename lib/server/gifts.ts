import "server-only";
import { phase1 } from "@/lib/config";
import { addBusinessDays, giftForAnswers, isGiftKind, type GiftKind } from "@/lib/gifts";
import { db, must } from "./db";
import { loadPhase1 } from "./diagnostic";

// Regalo según calificación (docs/OPEN_ENTRY.md §2). Ofrecido = el código tiene correo, la fase 1 terminó y se
// muestra el regalo (resultado completo o correo del informe). Queda fijo desde entonces (decisión 8).

export interface Gift {
  kind: GiftKind;
  dueAt: string;
}

async function readGift(code: string): Promise<Gift | null> {
  const row = must(await db().from("gifts").select("kind, due_at").eq("code", code).maybeSingle(), "gifts select") as {
    kind: string;
    due_at: string;
  } | null;
  return row && isGiftKind(row.kind) ? { kind: row.kind, dueAt: row.due_at } : null;
}

/**
 * Ofrece el regalo una sola vez por código: lo calcula con las respuestas guardadas, fija el plazo en días hábiles y
 * registra `gift_offered`. Si ya estaba ofrecido, devuelve ese (aunque las respuestas hayan cambiado). null si la fase 1
 * no terminó. Quien llama comprueba que el código tenga correo.
 */
export async function offerGift(code: string): Promise<Gift | null> {
  const existing = await readGift(code);
  if (existing) return existing;
  const saved = await loadPhase1(code);
  if (!saved.completed) return null;

  const kind = giftForAnswers(phase1, saved.answers, saved.calc);
  const dueAt = addBusinessDays(new Date(), phase1.copy.gifts[kind].days).toISOString();
  // Si dos peticiones llegan juntas, la clave primaria deja una sola fila y solo esa registra el evento.
  const inserted = must(
    await db().from("gifts").upsert({ code, kind, due_at: dueAt }, { onConflict: "code", ignoreDuplicates: true }).select("code"),
    "gifts insert",
  ) as { code: string }[];
  if (!inserted.length) return readGift(code);
  must(await db().from("events").insert({ code, type: "gift_offered", payload: { phase: 1, gift: kind, due_at: dueAt } }), "events insert");
  return { kind, dueAt };
}

/** offerGift sin romper a quien llama (pantalla de resultados, correo del informe): si falla, sin regalo. */
export async function offerGiftSafe(code: string): Promise<Gift | null> {
  try {
    return await offerGift(code);
  } catch (e) {
    console.error("[gift]", code, e);
    return null;
  }
}
