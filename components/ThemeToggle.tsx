"use client";

/**
 * Light/dark theme toggle, shown on every page (bottom-right corner).
 *
 * The theme is applied by adding/removing the `dark` class on <html>; all the
 * dark styling lives in globals.css. The choice persists in localStorage, and
 * a tiny inline script in the layout applies it before first paint so there's
 * no flash of the wrong theme on load.
 *
 * The <html> class itself is the source of truth: useSyncExternalStore watches
 * it (via a MutationObserver), so this component simply reflects whatever the
 * document says — including the state the pre-paint script set before React
 * hydrated.
 */

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

// Server snapshot: pages prerender in light mode.
function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !dark;
    // Flipping the class re-renders this button via the observer above.
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable (e.g. privacy mode) — theme still toggles
      // for this page view, it just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-lg shadow-md transition-colors hover:border-neutral-500"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
