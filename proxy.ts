import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_REQUEST_HEADER } from "@/lib/request-flags";

// Renueva la sesión de Supabase Auth en /admin (los Server Components no pueden escribir cookies).
// No decide permisos: cada página, acción y ruta de /admin llama a requireAdmin().
// También marca la petición como del panel, para que el layout raíz sirva <html lang="en"> (lib/server/access.ts).
export async function proxy(request: NextRequest) {
  request.headers.set(ADMIN_REQUEST_HEADER, "1");
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
