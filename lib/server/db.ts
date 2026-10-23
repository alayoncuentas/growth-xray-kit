import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente de Supabase con la clave secreta: salta RLS, así que solo existe en el servidor.
// Las claves vienen de variables de entorno (.env.local en desarrollo, Vercel en producción).

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.example to .env.local and fill it in.");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Lanza el error de Supabase con contexto; devuelve los datos si no hubo error. */
export function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Supabase (${what}): ${res.error.message}`);
  return res.data;
}
