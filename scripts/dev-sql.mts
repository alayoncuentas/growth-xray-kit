// Escribe supabase/dev-setup.sql: todas las migraciones en orden + el seed, para un proyecto de desarrollo vacío.
// Uso: npm run db:dev-sql

import { writeFileSync } from "node:fs";
import { buildDevSql } from "../lib/dev-sql.ts";

writeFileSync("supabase/dev-setup.sql", buildDevSql(process.cwd()));
console.log("✓ supabase/dev-setup.sql");
