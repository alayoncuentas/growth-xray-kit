"use client";

import { fill, getConfig, type Lang } from "@/lib/config";
import { useCurrentBusiness } from "@/lib/store";

export function PreparedFor({ lang }: { lang: Lang }) {
  const business = useCurrentBusiness();
  if (!business) return null;
  return <span className="text-[13px] text-muted">{fill(getConfig(lang).copy.preparedFor, { business })}</span>;
}
