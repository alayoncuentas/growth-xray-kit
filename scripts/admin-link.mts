// Solo desarrollo: genera un enlace de acceso a /admin sin enviar correo (útil cuando Supabase limita los envíos).
// Uso: npm run admin:link -- correo@ejemplo.com
//
// Protecciones: no corre con NODE_ENV=production ni en Vercel, solo para correos de ADMIN_EMAILS,
// y el enlace siempre apunta a un servidor local. El script no es una ruta de la app: no se despliega.

import { createClient } from "@supabase/supabase-js";
import { isAllowedEmail } from "../lib/admin.ts";

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production" || process.env.VERCEL) fail("admin:link is for local development only.");

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) fail("Usage: npm run admin:link -- you@example.com");
if (!isAllowedEmail(email, process.env.ADMIN_EMAILS)) fail(`${email} is not in ADMIN_EMAILS (.env.local).`);

const origin = (process.env.ADMIN_LINK_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
const host = new URL(origin).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) fail(`ADMIN_LINK_ORIGIN must be a local address, got ${origin}.`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
// generateLink no envía correo: devuelve el token para armar el enlace nosotros.
const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
if (error || !data.properties?.hashed_token) fail(`Supabase: ${error?.message ?? "no token returned"}`);

const link = `${origin}/admin/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=email`;
console.log(`\nSign-in link for ${email} (one use, expires in about an hour; open it in the browser you'll use):\n\n${link}\n`);
