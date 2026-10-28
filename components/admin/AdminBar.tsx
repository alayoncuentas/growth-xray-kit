import "server-only";
import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { fill } from "@/lib/config";
import { getAdmin } from "@/lib/server/auth";
import { adminCopy } from "@/lib/server/team";

/** Barra del panel con la sesión. No aparece en el login. */
export async function AdminBar() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-rule pb-2 text-sm">
      <Link href="/admin" className="flex min-h-11 items-center font-bold">
        {adminCopy.brand}
      </Link>
      <Link href="/admin/preview" className="flex min-h-11 items-center text-ink-2 underline underline-offset-4 hover:text-ink">
        {adminCopy.preview.nav}
      </Link>
      <span className="flex-1" />
      <span className="text-ink-2">{fill(adminCopy.signedInAs, { email: admin.email })}</span>
      <form action={signOut}>
        <button type="submit" className="min-h-11 cursor-pointer text-ink-2 underline underline-offset-4 hover:text-ink">
          {adminCopy.signOut}
        </button>
      </form>
    </div>
  );
}
