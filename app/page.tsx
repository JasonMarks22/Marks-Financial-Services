import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center bg-green-100 px-6 text-center">
      {/* Auth links (log in / sign up, or email + log out) in the top corner. */}
      <div className="absolute right-6 top-6">
        <AuthNav />
      </div>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
        Marks Financial Services
      </h1>
      <p className="mt-4 max-w-md text-lg leading-8 text-zinc-600">
        Your all-in-one personal finance toolkit — launching soon.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/tools/savings-goal"
          className="inline-block rounded-full bg-[#002E5D] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#00224a]"
        >
          Try the Savings Goal Calculator →
        </Link>
        <Link
          href="/tools/mortgage"
          className="inline-block rounded-full bg-[#002E5D] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#00224a]"
        >
          Try the Mortgage Calculator →
        </Link>
        <Link
          href="/tools/budget"
          className="inline-block rounded-full bg-[#002E5D] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#00224a]"
        >
          Try the Budget Calculator →
        </Link>
        <Link
          href="/tools/allocator"
          className="inline-block rounded-full bg-[#002E5D] px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#00224a]"
        >
          Try the Savings Allocator →
        </Link>
      </div>
    </main>
  );
}
