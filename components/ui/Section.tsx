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
  /** Deprecated: no longer rendered (labels above titles read as template chrome). */
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Center the header text (default: left-aligned). */
  center?: boolean;
  children: ReactNode;
}) {
  const hasHeader = Boolean(eyebrow || title || subtitle);
  return (
    <section id={id} className={`scroll-mt-24 py-12 sm:py-16 ${className}`}>
      <Container>
        {hasHeader && (
          <div className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
            {title && (
              <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className={`mt-2 text-base leading-7 text-muted ${center ? "mx-auto" : ""}`}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div className={hasHeader ? "mt-6 sm:mt-8" : ""}>{children}</div>
      </Container>
    </section>
  );
}
