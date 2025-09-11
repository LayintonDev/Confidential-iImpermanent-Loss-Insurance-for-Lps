"use client";

import React, { ReactNode } from "react";
import { AppKitProvider } from "@/lib/appkit";
import { ThemeProvider } from "next-themes";

export function Providers({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AppKitProvider cookies={cookies}>{children}</AppKitProvider>
    </ThemeProvider>
  );
}
