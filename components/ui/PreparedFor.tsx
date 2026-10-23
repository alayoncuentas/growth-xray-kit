"use client";

import { copy, fill } from "@/lib/config";
import { useCurrentBusiness } from "@/lib/store";

export function PreparedFor() {
  const business = useCurrentBusiness();
  if (!business) return null;
  return <span className="text-[13px] text-muted">{fill(copy.preparedFor, { business })}</span>;
}
