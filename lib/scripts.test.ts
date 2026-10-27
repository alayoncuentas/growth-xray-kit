import { execFile } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildDevSql } from "./dev-sql";

// Los scripts de scripts/*.mts corren con Node directo (sin Next.js ni Vitest): Node quita los tipos pero no resuelve
// imports relativos sin extensión ni el alias "@/". Estos tests los ejecutan de verdad, con una base falsa, para que un
// import como `from "./gifts"` en la cadena que cargan no vuelva a romperlos.

const ROOT = resolve(__dirname, "..");
const run = promisify(execFile);
const NODE_ARGS = ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON"];

/** Imports de valor (no `import type`) de un archivo. */
function runtimeImports(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/^\s*(?:import|export)\s+(type\s+)?([\s\S]*?)\s+from\s+"([^"]+)"/gm)) {
    if (!m[1] && !/^\{?\s*type\s/.test(m[2])) out.push(m[3]);
  }
  for (const m of src.matchAll(/^\s*import\s+"([^"]+)"/gm)) out.push(m[1]);
  return out;
}

/** Recorre los imports que Node cargaría desde `entry` y devuelve los que no puede resolver. */
function unresolvable(entry: string, seen = new Set<string>()): string[] {
  if (seen.has(entry)) return [];
  seen.add(entry);
  const problems: string[] = [];
  for (const spec of runtimeImports(readFileSync(entry, "utf8"))) {
    const where = `${relative(ROOT, entry)} → "${spec}"`;
    if (spec.startsWith("@/")) problems.push(`${where}: Node no entiende el alias @/`);
    if (!spec.startsWith(".")) continue;
    const target = resolve(dirname(entry), spec);
    if (!existsSync(target) || !statSync(target).isFile()) {
      problems.push(`${where}: falta la extensión (.ts)`);
      continue;
    }
    if (/\.(m?ts|tsx)$/.test(target)) problems.push(...unresolvable(target, seen));
  }
  return problems;
}

describe("scripts con Node directo", () => {
  it("todos los imports relativos de la cadena tienen extensión y no usan @/", () => {
    const scripts = readdirSync(join(ROOT, "scripts")).filter((f) => f.endsWith(".mts"));
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.flatMap((s) => unresolvable(join(ROOT, "scripts", s)))).toEqual([]);
  });

  it("db:dev-sql escribe el mismo SQL que buildDevSql (en una carpeta temporal)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gxr-devsql-"));
    try {
      cpSync(join(ROOT, "supabase", "migrations"), join(dir, "supabase", "migrations"), { recursive: true });
      cpSync(join(ROOT, "supabase", "seed.sql"), join(dir, "supabase", "seed.sql"));
      await run(process.execPath, [...NODE_ARGS, join(ROOT, "scripts", "dev-sql.mts")], { cwd: dir });
      expect(readFileSync(join(dir, "supabase", "dev-setup.sql"), "utf8")).toBe(buildDevSql(dir));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("admin:link con una base falsa", () => {
  const requests: { method?: string; url?: string; body: string }[] = [];
  const server = createServer((req: IncomingMessage, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      requests.push({ method: req.method, url: req.url, body });
      // Respuesta de GoTrue a generate_link (supabase-js arma data.properties con estos campos).
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "u1", email: "team@x.test", action_link: "", email_otp: "", hashed_token: "tok-123", redirect_to: "", verification_type: "magiclink" }));
    });
  });
  let base = "";

  beforeAll(async () => {
    await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

  /** Corre el script con un entorno limpio: nada de .env.local ni de las variables de quien corre los tests. */
  const link = (email: string) =>
    run(process.execPath, [...NODE_ARGS, join(ROOT, "scripts", "admin-link.mts"), email], {
      cwd: ROOT,
      env: { PATH: process.env.PATH ?? "", NODE_ENV: "development", ADMIN_EMAILS: "team@x.test", NEXT_PUBLIC_SUPABASE_URL: base, SUPABASE_SECRET_KEY: "fake-secret" },
    });

  it("arma el enlace local con el token que devuelve la base", async () => {
    const { stdout } = await link("Team@X.test");
    expect(stdout).toContain("http://localhost:3000/admin/auth/callback?token_hash=tok-123&type=email");
    const call = requests.find((r) => r.url?.endsWith("/auth/v1/admin/generate_link"));
    expect(call?.method).toBe("POST");
    expect(JSON.parse(call!.body)).toMatchObject({ type: "magiclink", email: "team@x.test" });
  });

  it("un correo fuera de ADMIN_EMAILS falla sin llamar a la base", async () => {
    const before = requests.length;
    await expect(link("intruso@x.test")).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("is not in ADMIN_EMAILS") });
    expect(requests.length).toBe(before);
  });
});
