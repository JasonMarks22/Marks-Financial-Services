import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { GUIDES, getGuide } from "../guides";

// Prerender all guides at build time.
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };
  return { title: guide.title, description: guide.summary };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const { Body } = guide;

  return (
    <main className="flex-1 bg-surface">
      <Container className="py-14 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/learn"
            className="text-sm font-medium text-link underline-offset-2 hover:underline"
          >
            &larr; Learn
          </Link>

          <article className="mt-4">
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {guide.title}
            </h1>
            <div className="mt-6">
              <Body />
            </div>
          </article>

          <div className="mt-10 border-t border-edge pt-6">
            <Disclaimer />
          </div>

          <div className="mt-8">
            <Link
              href="/learn"
              className="text-sm font-semibold text-link underline-offset-2 hover:underline"
            >
              &larr; Back to all guides
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
