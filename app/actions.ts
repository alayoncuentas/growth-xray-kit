"use server";

import { redirect } from "next/navigation";
import { checkAccess } from "@/lib/server/access";

export type CodeFormState = { error?: "format" | "rate"; code?: string };

export async function submitCode(_prev: CodeFormState, formData: FormData): Promise<CodeFormState> {
  const raw = String(formData.get("code") ?? "");
  const r = await checkAccess(raw);
  if (!r.ok) return { error: r.reason, code: raw };
  redirect(`/x/${encodeURIComponent(r.access.code)}`);
}
