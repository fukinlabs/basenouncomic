import { Metadata } from "next";
import { minikitConfig } from "../../minikit.config";

const ROOT_URL = process.env.NEXT_PUBLIC_ROOT_URL || "http://localhost:3000";

// Create MiniApp embed for the mint page
const miniappEmbed = {
  version: "1",
  imageUrl: `${ROOT_URL}/api/og?tokenId=0`,
  button: {
    title: "🎨 Mint NFT",
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
  title: `Mint NFT - ${minikitConfig.miniapp.name}`,
  description: `Mint your NFT on ${minikitConfig.miniapp.name}`,
  openGraph: {
    title: `Mint NFT - ${minikitConfig.miniapp.name}`,
    description: `Mint your NFT on ${minikitConfig.miniapp.name}`,
    images: [`${ROOT_URL}/api/og?tokenId=0`],
  },
  other: {
    "fc:miniapp": JSON.stringify(miniappEmbed),
    "fc:frame": JSON.stringify(frameEmbed), // Backward compatibility
  },
};

export default function MintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

