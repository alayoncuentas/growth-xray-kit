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
    <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-line pb-3 text-sm">
      <Link href="/admin" className="font-semibold">
        {adminCopy.brand}
      </Link>
      <Link href="/admin/preview" className="text-muted underline underline-offset-2 hover:text-ink">
        {adminCopy.preview.nav}
      </Link>
      <span className="flex-1" />
      <span className="text-muted">{fill(adminCopy.signedInAs, { email: admin.email })}</span>
      <form action={signOut}>
        <button type="submit" className="cursor-pointer text-muted underline underline-offset-2 hover:text-ink">
          {adminCopy.signOut}
        </button>
      </form>
    </div>
  );
}
