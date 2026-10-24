import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { getAdmin } from "@/lib/server/auth";
import { adminCopy } from "@/lib/server/team";

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>{searchParams.then((sp) => <Login error={typeof sp.error === "string" ? sp.error : null} />)}</Suspense>
    </Container>
  );
}

async function Login({ error }: { error: string | null }) {
  if (await getAdmin()) redirect("/admin");
  const t = adminCopy.login;
  const initialError = error === "link" ? t.errorLink : error === "denied" ? t.errorDenied : null;
  return (
    <Card>
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{t.title}</h1>
      <p className="text-muted">{t.sub}</p>
      <LoginForm t={{ label: t.label, cta: t.cta, sent: t.sent, errorEmail: t.errorEmail, errorSend: t.errorSend }} initialError={initialError} />
    </Card>
  );
}
