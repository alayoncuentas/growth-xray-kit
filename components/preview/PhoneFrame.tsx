"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pantalla real en un marco del ancho de un teléfono (400 px). Es un iframe de la ruta real, así que los
 * media queries responden a 400 px igual que en el teléfono. Mismo origen: el alto se ajusta al contenido.
 */
export function PhoneFrame({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);

  useEffect(() => {
    const f = ref.current;
    if (!f) return;
    let ro: ResizeObserver | undefined;
    const measure = () => {
      const body = f.contentDocument?.body;
      if (body) setHeight(Math.max(240, Math.ceil(body.getBoundingClientRect().height) + 24));
    };
    const onLoad = () => {
      ro?.disconnect();
      const body = f.contentDocument?.body;
      if (!body) return;
      ro = new ResizeObserver(measure); // el contenido llega por streaming y cambia de alto
      ro.observe(body);
      measure();
    };
    f.addEventListener("load", onLoad);
    if (f.contentDocument?.readyState === "complete") onLoad();
    return () => {
      f.removeEventListener("load", onLoad);
      ro?.disconnect();
    };
  }, []);

  // 402 px = 400 px de contenido + 1 px de borde por lado.
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      loading="lazy"
      style={{ height }}
      className="block w-[402px] max-w-full rounded-[18px] border border-line bg-paper"
    />
  );
}
