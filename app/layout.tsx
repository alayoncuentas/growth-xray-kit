import type { Metadata, Viewport } from "next";
import { Host_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { isTestDeploy } from "@/lib/seo";
import { documentLang } from "@/lib/server/access";
import "./globals.css";

// Host Grotesk, la tipografía de la marca: cuerpo 400, etiquetas 600–700, encabezados 700, display 800.
const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-host-grotesk",
});

export const metadata: Metadata = {
  title: "Growth X-Ray",
  description: "A private diagnostic that shows where new customers slip away.",
  // Entorno de pruebas (xray-test): no se indexa (lib/seo.ts; la cabecera X-Robots-Tag está en next.config.ts).
  ...(isTestDeploy(process.env.NEXT_PUBLIC_APP_URL) ? { robots: { index: false, follow: false } } : {}),
};

// El idioma del documento sale de la petición (cookie del botón EN / ES o Accept-Language), así que el layout raíz no
// puede prerenderizarse: con Cache Components, `instant = false` permite que espere esa lectura (es inmediata).
export const instant = false;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Aplica el tema guardado antes del primer pintado, para evitar el parpadeo. Como cambia data-theme en <html> antes de
// hidratar, <html> lleva suppressHydrationWarning (solo ese elemento; el idioma ya no depende del cliente).
const themeScript = `try{var t=localStorage.getItem("gxr-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Una sola fuente del idioma, leída en el servidor: <html lang> y el encabezado reciben el mismo valor.
  const lang = await documentLang();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${hostGrotesk.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SiteHeader lang={lang} />
        {children}
      </body>
    </html>
  );
}
