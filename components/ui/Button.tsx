import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Shared button. Renders a Next <Link> when `href` is given, otherwise a
 * native <button>. Two main variants:
 *  - primary:   solid brand green, white text
 *  - secondary: outline on card background
 *  - ghost:     borderless, for low-emphasis actions
 */

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-soft hover:bg-secondary hover:shadow-lifted",
  secondary:
    "border border-edge bg-card text-ink shadow-soft hover:border-accent hover:text-link",
  ghost: "text-link hover:bg-card-tint",
};

const SIZES: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition hover:-translate-y-px active:translate-y-0";

export function Button({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
