import type { Metadata } from "next";
import React from "react";
import "./globals.css";

import { RootProvider } from "./rootProvider";
import { minikitConfig } from "../minikit.config";
import HeaderWrapper from "./components/HeaderWrapper";

// Use same ROOT_URL logic as minikit.config.ts for consistency
const ROOT_URL =
  process.env.NEXT_PUBLIC_ROOT_URL ||
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://farcasterabstact.wtf');

// Create MiniApp embed for the home page according to Farcaster docs
const miniappEmbed = {
  version: "1",
  imageUrl: `${ROOT_URL}/blue-hero.png`,
  button: {
    title: " Mint NFT",
    action: {
      type: "launch_miniapp",
      url: `${ROOT_URL}/mint`,
      name: minikitConfig.miniapp.name,
      splashImageUrl: minikitConfig.miniapp.splashImageUrl,
      splashBackgroundColor: minikitConfig.miniapp.splashBackgroundColor,
    },
  },
};

// For backward compatibility
const frameEmbed = {
  ...miniappEmbed,
  button: {
    ...miniappEmbed.button,
    action: {
      ...miniappEmbed.button.action,
      type: "launch_frame",
    },
  },
};

export const metadata: Metadata = {
  title: `${minikitConfig.miniapp.name} - ${minikitConfig.miniapp.subtitle}`,
  description: minikitConfig.miniapp.description || "Mint your unique NFT with generative art!",
  openGraph: {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description || "Mint your unique NFT with generative art!",
    images: [minikitConfig.miniapp.heroImageUrl || `${ROOT_URL}/blue-hero.png`],
  },
  other: {
    "fc:miniapp": JSON.stringify(miniappEmbed),
    "fc:frame": JSON.stringify(frameEmbed), // Backward compatibility
  },
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <RootProvider>
          {/* Only show Header on non-root pages to optimize initial loading */}
          <HeaderWrapper />
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
