import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authClient, isAdminEmail } from "@/lib/server/auth";

// Destino del enlace mágico. Acepta los dos formatos de Supabase:
// ?code=… (PKCE, plantilla por defecto) y ?token_hash=…&type=… (plantilla con token_hash, o `npm run admin:link`).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const supabase = await authClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  // Solo los tipos de inicio de sesión por correo (el script de desarrollo usa "email").
  const rawType = url.searchParams.get("type");
  const type: EmailOtpType | null = rawType === "email" || rawType === "magiclink" ? rawType : null;

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { data: { user: null }, error: new Error("missing token") };

  if (error || !data.user) return to("/admin/login?error=link");
  if (!isAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    return to("/admin/login?error=denied");
  }
  return to("/admin");
}
