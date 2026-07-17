import type { ReactNode } from "react";
import { Container } from "./Container";

/**
 * Full-width page section with generous vertical rhythm and an optional
 * eyebrow / title / subtitle header. Children render inside a Container.
 */
export function Section({
  id,
  className = "",
  eyebrow,
  title,
  subtitle,
  center = false,
  children,
}: {
  id?: string;
  className?: string;
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Center the header text (default: left-aligned). */
  center?: boolean;
  children: ReactNode;
}) {
  const hasHeader = Boolean(eyebrow || title || subtitle);
  return (
    <section id={id} className={`scroll-mt-24 py-16 sm:py-20 lg:py-24 ${className}`}>
      <Container>
        {hasHeader && (
          <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
            {eyebrow && (
              <p className="text-sm font-semibold uppercase tracking-widest text-link">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className={`mt-4 text-base leading-7 text-muted sm:text-lg sm:leading-8 ${center ? "mx-auto" : ""}`}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className={hasHeader ? "mt-10 sm:mt-12" : ""}>{children}</div>
      </Container>
    </section>
  );
}
