"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The board's signature element: a departures-board style numeral display.
 * Characters flip when the value changes, staggered left to right.
 */
export function SplitFlap({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const [flipping, setFlipping] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlipping(true);
      const t = setTimeout(() => setFlipping(false), 420);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`tabular ${className}`} aria-live="polite">
      {value.split("").map((ch, i) => (
        <span
          key={i}
          className={`flap-char ${flipping ? "is-flipping" : ""}`}
          style={flipping ? { animationDelay: `${i * 16}ms` } : undefined}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
