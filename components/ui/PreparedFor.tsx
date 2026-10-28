"use client";

import { fill, getConfig, type Lang } from "@/lib/config";
import { useCurrentBusiness } from "@/lib/store";

export function PreparedFor({ lang }: { lang: Lang }) {
  const business = useCurrentBusiness();
  if (!business) return null;
  return <span className="text-sm text-ink-2">{fill(getConfig(lang).copy.preparedFor, { business })}</span>;
}
