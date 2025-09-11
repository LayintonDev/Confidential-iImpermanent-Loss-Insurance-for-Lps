import "./globals.css";
import { Providers } from "@/components/providers";
import React from "react";
import { headers } from "next/headers";
export const metadata = {
  title: "Confidential IL Insurance Hook",
  description: "Uniswap v4 Hook providing confidential impermanent loss insurance using Fhenix FHE and EigenLayer AVS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersObj = headers();
  const cookies = headersObj.get("cookie");
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-gradient-to-br from-black via-gray-900 to-black min-h-screen">
        <Providers cookies={cookies}>
          <div className="relative flex min-h-screen flex-col">
            <div className="cyber-grid fixed inset-0 opacity-20"></div>
            <div className="relative z-10 flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
