import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "ghost" | "line";

const base =
  "inline-flex items-center justify-center rounded-full px-[22px] py-3 font-semibold cursor-pointer transition-opacity disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink",
  ghost: "bg-transparent px-2 text-muted",
  line: "border-[1.5px] border-line bg-transparent text-ink",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
