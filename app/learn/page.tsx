import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { ArrowRightIcon } from "@/components/ui/icons";
import { GUIDES } from "./guides";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Plain-English guides to investing basics: how compounding works, what an expense ratio is, and how backtests are built.",
};

export default function LearnPage() {
  return (
    <main className="flex-1 bg-surface">
      <Container className="py-14 sm:py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
            Learn
          </h1>
          <p className="mt-3 text-lg leading-8 text-muted">
            Plain-English guides to the ideas behind the tools. Short reads, no
            jargon.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/learn/${guide.slug}`}
              className="group"
            >
              <Card hover className="flex h-full flex-col p-6">
                <h2 className="text-lg font-bold text-ink">{guide.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                  {guide.summary}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-link">
                  Read guide
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </main>
  );
}
