import type { Metadata } from "next";
import React from "react";
import "./globals.css";

import { RootProvider } from "./rootProvider";
export const metadata: Metadata = {
  title: "Blad Gamet",
  description: "A Next.js application with Web3 and Farcaster integration",
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

