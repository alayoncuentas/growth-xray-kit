import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getConfig, type Lang } from "@/lib/config";
import { browserLang, type AccessError } from "@/lib/server/access";

/**
 * Link con un código que no sirve: dice por qué (vencido, inexistente o demasiados intentos) en vez de un 404 genérico.
 * Sin código válido no hay idioma de sesión: el elegido con el botón EN / ES, si no el del navegador, si no inglés.
 */
export async function CodeError({ reason }: { reason: AccessError }) {
  const lang: Lang = await browserLang();
  const t = getConfig(lang).copy.codeError;
  const [title, sub] =
    reason === "expired" ? [t.expiredTitle, t.expiredSub] : reason === "rate" ? [t.rateTitle, t.rateSub] : [t.unknownTitle, t.unknownSub];
  return (
    <Card>
      <h1 className="mb-3 display text-[clamp(28px,6vw,40px)]">{title}</h1>
      <p className="mb-[22px] text-muted">{sub}</p>
      <ButtonLink href="/">{t.cta}</ButtonLink>
    </Card>
  );
}
