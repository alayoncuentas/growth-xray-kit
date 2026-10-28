"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { startOpen, type StartState } from "@/app/actions";
import { Arrow, Button } from "@/components/ui/Button";
import { useConfig, useLang } from "@/lib/i18n";
import { TURNSTILE_ACTION, UTM_KEYS } from "@/lib/open-entry";
import { ErrorText } from "@/components/ui/field";

// Widget de Cloudflare Turnstile (modo Managed). El token va al servidor, que lo valida antes de crear la sesión.
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  remove(id: string): void;
  reset(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<Turnstile> | null = null;
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    s.onerror = () => {
      loading = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Primer contacto: UTM de la URL de llegada y referrer, como campos ocultos del formulario. */
function useArrival() {
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const next: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const x = p.get(k);
      if (x) next[k] = x;
    }
    if (document.referrer) next.referrer = document.referrer;
    setV(next); // eslint-disable-line react-hooks/set-state-in-effect -- solo existe en el navegador
  }, []);
  return v;
}

export function StartForm({ siteKey }: { siteKey: string }) {
  const s = useConfig().copy.start;
  const lang = useLang();
  const [state, action, pending] = useActionState<StartState, FormData>(startOpen, {});
  const [token, setToken] = useState<string | null>(null);
  const [widgetFailed, setWidgetFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const arrival = useArrival();

  useEffect(() => {
    let gone = false;
    loadTurnstile()
      .then((t) => {
        if (gone || !box.current) return;
        widget.current = t.render(box.current, {
          sitekey: siteKey,
          action: TURNSTILE_ACTION,
          language: lang,
          appearance: "interaction-only", // solo se ve si Cloudflare necesita que la persona interactúe
          "response-field": false, // el token va en el campo oculto del formulario, no en uno propio del widget
          callback: (tk: string) => {
            setToken(tk);
            setWidgetFailed(false);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setWidgetFailed(true);
          },
        });
      })
      .catch(() => setWidgetFailed(true));
    return () => {
      gone = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, lang]);

  // El token sirve una sola vez: si el servidor respondió con error, se pide otro para el próximo intento.
  useEffect(() => {
    if (!state.error || !widget.current || !window.turnstile) return;
    window.turnstile.reset(widget.current);
    setToken(null); // el token anterior ya se usó
  }, [state]);

  const errors = { turnstile: s.errorTurnstile, limit: s.errorLimit, unavailable: s.errorUnavailable, generic: s.errorGeneric };
  const error: string | null = widgetFailed ? s.errorTurnstile : state.error ? errors[state.error] : null;

  return (
    <form action={action} className="grid gap-2.5">
      {Object.entries(arrival).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="cf-turnstile-response" value={token ?? ""} />
      <div ref={box} />
      <Button type="submit" disabled={pending || !token} className="w-full sm:w-auto sm:justify-self-start">
        {s.cta}
        <Arrow />
      </Button>
      {error ? (
        <ErrorText role="alert">
          {error}
        </ErrorText>
      ) : (
        <p className="text-sm text-muted" aria-live="polite">
          {token ? s.note : s.verifying}
        </p>
      )}
    </form>
  );
}
