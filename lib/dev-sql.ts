// SQL único para crear una base de DESARROLLO desde cero: todas las migraciones en orden y, al final, el seed.
// Lo escribe `npm run db:dev-sql` en supabase/dev-setup.sql; lib/dev-sql.test.ts avisa si quedó desactualizado.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_RE = /^\d{14}_[a-z0-9_]+\.sql$/;

/** Migraciones en orden (por los 14 dígitos del nombre). Falla si alguna no sigue el formato. */
export function migrationFiles(dir: string): string[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  const bad = files.filter((f) => !MIGRATION_RE.test(f));
  if (bad.length) throw new Error(`Migraciones con nombre inválido (se espera AAAAMMDDhhmmss_nombre.sql): ${bad.join(", ")}`);
  return files.sort();
}

export function buildDevSql(root: string): string {
  const dir = join(root, "supabase", "migrations");
  const parts = migrationFiles(dir).map((f) => `-- >>>>> migrations/${f}\n\n${readFileSync(join(dir, f), "utf8").trim()}\n`);
  const seed = readFileSync(join(root, "supabase", "seed.sql"), "utf8").trim();
  return [
    "-- ============================================================================",
    "-- GENERADO con `npm run db:dev-sql`. No editar a mano: cambiar las migraciones y regenerar.",
    "-- SOLO PARA UN PROYECTO DE SUPABASE DE DESARROLLO, VACÍO. Nunca en producción: incluye datos de ejemplo.",
    "-- Pegar completo en el SQL Editor del proyecto nuevo y correr una vez.",
    "-- ============================================================================",
    "",
    ...parts,
    "-- >>>>> seed.sql (solo desarrollo)",
    "",
    seed,
    "",
  ].join("\n");
}
