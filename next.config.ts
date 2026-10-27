import type { NextConfig } from "next";
import { isTestDeploy, NOINDEX } from "./lib/seo";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Entorno de pruebas (NEXT_PUBLIC_APP_URL con "xray-test"): X-Robots-Tag en todas las respuestas (lib/seo.ts).
  async headers() {
    return isTestDeploy(process.env.NEXT_PUBLIC_APP_URL) ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: NOINDEX }] }] : [];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
