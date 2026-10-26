import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getConfig, type Lang } from "@/lib/config";
import { cookieLang, type AccessError } from "@/lib/server/access";

/**
 * Link con un código que no sirve: dice por qué (vencido, inexistente o demasiados intentos) en vez de un 404 genérico.
 * Sin código válido no hay idioma de sesión: usa el que eligió este navegador (cookie), o inglés.
 */
export async function CodeError({ reason }: { reason: AccessError }) {
  const lang: Lang = (await cookieLang()) ?? "en";
  const t = getConfig(lang).copy.codeError;
  const [title, sub] =
    reason === "expired" ? [t.expiredTitle, t.expiredSub] : reason === "rate" ? [t.rateTitle, t.rateSub] : [t.unknownTitle, t.unknownSub];
  return (
    <Card>
      <h1 className="mb-3 text-[clamp(30px,6vw,44px)] tracking-[-0.02em]">{title}</h1>
      <p className="mb-[22px] text-muted">{sub}</p>
      <ButtonLink href="/">{t.cta}</ButtonLink>
    </Card>
  );
}
