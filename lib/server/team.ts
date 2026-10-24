import "server-only";
import raw from "@/config/team.config.json";
import type { TeamFlag, Verdict } from "@/lib/scoring";

// Textos de la vista del equipo y del panel. Solo servidor: nunca deben llegar a una ruta pública.

export interface TeamConfig {
  title: string;
  axes: Record<"need" | "potential" | "readiness", { label: string; note: string }>;
  verdicts: Record<Verdict, string>;
  flags: Record<TeamFlag, string>;
  kv: Record<"code" | "monthly" | "cautious" | "ads" | "noAds" | "opening", string>;
  openingLine: string;
  // Textos del panel: se tipan de forma laxa porque solo se renderizan.
  admin: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const team = raw as unknown as TeamConfig;
export const adminCopy = team.admin;
