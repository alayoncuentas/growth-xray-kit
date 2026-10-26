import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDevSql, migrationFiles } from "./dev-sql";

describe("SQL de desarrollo", () => {
  it("las migraciones tienen nombre de 14 dígitos y van en orden", () => {
    const files = migrationFiles("supabase/migrations");
    expect(files[0]).toBe("20261023000000_init.sql");
    expect(files).toContain("20261027000000_open_entry.sql");
  });

  it("supabase/dev-setup.sql está al día (si falla: npm run db:dev-sql)", () => {
    expect(readFileSync("supabase/dev-setup.sql", "utf8")).toBe(buildDevSql(process.cwd()));
  });
});
