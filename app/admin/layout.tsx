import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";

export const metadata: Metadata = { title: "Team dashboard · Growth X-Ray", robots: { index: false, follow: false } };

// Panel interno. Cada página, acción y ruta verifica la sesión de admin por su cuenta (requireAdmin);
// este layout solo agrega la barra con la sesión.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-report">
      <Suspense fallback={null}>
        <AdminBar />
      </Suspense>
      {children}
    </div>
  );
}
