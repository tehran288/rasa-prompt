"use client";

import type { PromptTier } from "@rasa/shared";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { CommandPalette } from "./command-palette";
import { QuickViewSheet } from "./quick-view";

export interface PaletteEntry {
  slug: string;
  title: string;
  tier: PromptTier;
  keywords: string;
}

interface UiState {
  openPalette: () => void;
  openQuickView: (slug: string) => void;
}

const Ctx = createContext<UiState>({ openPalette: () => {}, openQuickView: () => {} });

export function useUi() {
  return useContext(Ctx);
}

export function UiStateProvider({
  children,
  index,
}: {
  children: ReactNode;
  index: PaletteEntry[];
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quick, setQuick] = useState<string | null>(null);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openQuickView = useCallback((slug: string) => setQuick(slug), []);
  const value = useMemo(() => ({ openPalette, openQuickView }), [openPalette, openQuickView]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        index={index}
        onQuickView={(slug) => {
          setPaletteOpen(false);
          setQuick(slug);
        }}
      />
      <QuickViewSheet slug={quick} onClose={() => setQuick(null)} />
    </Ctx.Provider>
  );
}
