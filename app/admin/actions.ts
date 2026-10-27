"use server";

import { redirect } from "next/navigation";
import { parseCompanyForm, type CompanyErrors, EXPIRY_CHOICES } from "@/lib/admin";
import { phase1 } from "@/lib/config";
import { addCode, createCompany, markGiftDelivered } from "@/lib/server/admin-data";
import { authClient, isAdminEmail, requireAdmin } from "@/lib/server/auth";
import { appOrigin } from "@/lib/server/origin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginState = { sent?: string; error?: "email" | "send"; email?: string };

/**
 * Envía el enlace mágico solo si el correo está en ADMIN_EMAILS. A cualquier otro le responde lo mismo
 * ("si está en la lista, te llegó"), sin enviar nada: así no se puede averiguar qué correos tienen acceso.
 */
export async function requestLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "email", email };
  if (isAdminEmail(email)) {
    const supabase = await authClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${await appOrigin()}/admin/auth/callback`, shouldCreateUser: true },
    });
    if (error) {
      console.error("[admin login]", error.message);
      return { error: "send", email };
    }
  }
  return { sent: email };
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export type CompanyFormState = { errors?: CompanyErrors; values?: Record<string, string> };

const industries = () => {
  const q = phase1.questions.find((x) => x.id === "industry");
  return q && q.type !== "calculator" ? q.options.map((o) => o.id) : [];
};

export async function createCompanyAction(_prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  await requireAdmin();
  const r = parseCompanyForm((k) => formData.get(k) as string | null, industries());
  if (!r.ok) {
    const values = Object.fromEntries([...formData.entries()].filter(([k, v]) => !k.startsWith("$") && typeof v === "string")) as Record<string, string>;
    return { errors: r.errors, values };
  }
  const code = await createCompany(r.data);
  redirect(`/admin/c/${code}?created=1`);
}

export type NewCodeState = { error?: string };

export async function newCodeAction(fromCode: string, _prev: NewCodeState, formData: FormData): Promise<NewCodeState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  if (email && !EMAIL_RE.test(email)) return { error: "email" };
  const exp = String(formData.get("expiresDays") ?? "");
  const days = (EXPIRY_CHOICES as readonly number[]).includes(Number(exp)) ? Number(exp) : null;
  const code = await addCode(fromCode, email, days);
  if (!code) return { error: "company" };
  redirect(`/admin/c/${code}?created=1`);
}

/** "Mark delivered" en el detalle de un lead: marca el regalo como entregado y vuelve al detalle. */
export async function markGiftDeliveredAction(code: string): Promise<void> {
  await requireAdmin();
  await markGiftDelivered(code);
  redirect(`/admin/c/${encodeURIComponent(code)}`);
}
