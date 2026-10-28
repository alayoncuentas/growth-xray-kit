import { Suspense } from "react";
import { CompanyForm } from "@/components/admin/CompanyForm";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LoadingCard } from "@/components/ui/Loading";
import { EXPIRY_CHOICES } from "@/lib/admin";
import { isChoice, LANGS, phase1 } from "@/lib/config";
import { requireAdmin } from "@/lib/server/auth";
import { adminCopy } from "@/lib/server/team";

export default function NewCompanyPage() {
  return (
    <Container>
      <Suspense fallback={<LoadingCard />}>
        <NewCompany />
      </Suspense>
    </Container>
  );
}

async function NewCompany() {
  await requireAdmin();
  const t = adminCopy.form;
  const q = phase1.questions.find((x) => x.id === "industry");
  const industries = q && isChoice(q) ? q.options.map((o) => ({ id: o.id, label: o.label })) : [];
  return (
    <Card className="mt-0">
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <h1 className="mb-3 display text-[clamp(28px,5vw,40px)]">{t.title}</h1>
      <p className="text-muted">{t.sub}</p>
      <CompanyForm
        t={t}
        industries={industries}
        expiryChoices={[...EXPIRY_CHOICES]}
        langs={LANGS.map((id) => ({ id, label: adminCopy.langs[id] }))}
      />
    </Card>
  );
}
