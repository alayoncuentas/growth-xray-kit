import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isAllowedEmail } from "@/lib/admin";

// Sesión de /admin con Supabase Auth (enlace mágico por correo). La sesión vive en cookies.
// Solo entran los correos de ADMIN_EMAILS; los datos se leen después con la clave secreta (lib/server/db.ts).

/** Cliente de Supabase Auth ligado a las cookies de esta petición (clave publicable, no la secreta). */
export async function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // En un Server Component no se pueden escribir cookies; el proxy ya renovó la sesión.
        }
      },
    },
  });
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return isAllowedEmail(email, process.env.ADMIN_EMAILS);
}

/** Usuario admin de esta petición, o null. getUser() valida el token con Supabase (no confía en la cookie). */
export const getAdmin = cache(async (): Promise<{ email: string } | null> => {
  await connection(); // siempre en tiempo de petición: el cliente de Auth compara la expiración con Date.now()
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  return email && isAdminEmail(email) ? { email } : null;
});

/** Para cada página, acción y ruta de /admin: sin sesión de admin, al login. */
export async function requireAdmin(): Promise<{ email: string }> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
