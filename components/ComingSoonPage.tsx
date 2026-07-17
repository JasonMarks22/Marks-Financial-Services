import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

/**
 * Shared layout for sections of the site that are announced in the nav but
 * not built yet. Always honestly labeled — nothing here pretends to work.
 */
export function ComingSoonPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  /** Optional extra content (e.g. links to related tools that DO exist). */
  children?: ReactNode;
}) {
  return (
    <main className="flex-1 bg-surface">
      <Section center>
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="soon">Coming soon</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">{description}</p>
        </div>
        {children && (
          <Card className="mx-auto mt-10 max-w-2xl p-8 text-left">
            {children}
          </Card>
        )}
        <div className="mt-10 text-center">
          <Button href="/" variant="secondary">
            Back to all tools
          </Button>
        </div>
      </Section>
    </main>
  );
}
