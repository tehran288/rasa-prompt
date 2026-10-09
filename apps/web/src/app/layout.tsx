import type { ReactNode } from "react";
import "./globals.css";

// The <html>/<body> shell lives in app/[locale]/layout.tsx so lang/dir are per-locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
