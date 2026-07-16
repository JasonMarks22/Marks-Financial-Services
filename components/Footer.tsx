/**
 * Simple shared footer, rendered on every page from the root layout.
 */

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white px-6 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 text-center text-xs text-neutral-500 sm:flex-row sm:justify-between">
        <span className="font-medium text-neutral-700">
          Marks Financial Services
        </span>
        <span>Educational tools, not financial advice.</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
