"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type PaletteEntry, UiStateProvider } from "./ui-state";

export function Providers({
  children,
  dir,
  locale,
  index,
}: {
  children: ReactNode;
  dir: "rtl" | "ltr";
  locale: string;
  index: PaletteEntry[];
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <DirectionProvider direction={dir}>
        <TooltipProvider>
          <UiStateProvider index={index}>{children}</UiStateProvider>
          <Toaster dir={dir} position="top-center" richColors={false} />
        </TooltipProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}
