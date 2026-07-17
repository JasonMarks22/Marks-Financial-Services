"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Counts up from 0 to `value` when scrolled into view. Renders the final
 * value immediately for users who prefer reduced motion (and before
 * hydration, so the number is always present for screen readers and SEO).
 */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduceMotion) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = `${prefix}${Math.round(v).toLocaleString("en-US")}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, reduceMotion, value, prefix, suffix]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {`${prefix}${value.toLocaleString("en-US")}${suffix}`}
    </span>
  );
}
