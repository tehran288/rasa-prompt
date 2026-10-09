"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

export function useCopy() {
  const t = useTranslations("common");
  return useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copied"));
        return true;
      } catch {
        toast.error(t("copyFailed"));
        return false;
      }
    },
    [t],
  );
}
