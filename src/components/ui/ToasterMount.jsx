"use client";

import { Toaster } from "react-hot-toast";

/**
 * Mounted once in the root layout. Styling is driven by the design tokens in
 * globals.css — flat fills, one small radius, no gradients.
 */
export function ToasterMount() {
  return (
    <Toaster
      position="bottom-center"
      gutter={10}
      toastOptions={{
        duration: 4500,
        className:
          "!bg-surface !text-ink !text-sm !rounded-lg !border !border-border-subtle !shadow-elevated !max-w-sm",
        success: {
          duration: 4000,
          iconTheme: {
            primary: "var(--color-brand-primary)",
            secondary: "var(--color-surface)",
          },
        },
        error: {
          duration: 6000,
          iconTheme: {
            primary: "var(--color-danger)",
            secondary: "var(--color-surface)",
          },
        },
      }}
    />
  );
}

export default ToasterMount;
