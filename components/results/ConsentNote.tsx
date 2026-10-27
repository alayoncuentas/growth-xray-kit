"use client";

import { fill } from "@/lib/config";
import type { GiftKind } from "@/lib/gifts";
import { useConfig } from "@/lib/i18n";

/**
 * Texto "By continuing…" debajo de cada campo de correo (pantalla del correo, parcial y "Save and finish later").
 * Su versión es EMAIL_CONSENT_VERSION (lib/email.ts): se guarda con el correo.
 */
export function ConsentNote({ gift, inverse = false }: { gift: GiftKind; inverse?: boolean }) {
  const cfg = useConfig();
  const t = cfg.copy.capture;
  return (
    <p className={`text-[12px] leading-normal ${inverse ? "text-paper/70" : "text-muted"}`}>
      {fill(t.consent, { giftShort: cfg.copy.gifts[gift].short })}{" "}
      <a href="/privacy" className={`underline underline-offset-2 ${inverse ? "hover:text-paper" : "hover:text-ink"}`}>
        {t.privacy}
      </a>
    </p>
  );
}
