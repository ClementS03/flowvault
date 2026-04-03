"use client";

import { useRef, useEffect } from "react";

/**
 * Hidden textarea used as the clipboard bridge for Webflow copy operations.
 * The element needs to exist in the DOM so copyToWebflow() can trigger a
 * synthetic copy event on it. It is visually hidden and aria-hidden.
 *
 * Usage: place <ClipboardBridge /> once in the root layout.
 * Access the element via document.getElementById('clipboard-bridge').
 */
export default function ClipboardBridge() {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Expose the element globally so copyToWebflow() can find it without prop-drilling
    if (ref.current) {
      (window as any).__clipboardBridge = ref.current;
    }
  }, []);

  return (
    <textarea
      id="clipboard-bridge"
      ref={ref}
      aria-hidden="true"
      readOnly
      style={{
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
