import { Metadata } from "next";
import { minikitConfig } from "../../../minikit.config";

// Get ROOT_URL from env or use Vercel URL as fallback
const ROOT_URL = process.env.NEXT_PUBLIC_ROOT_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Generate metadata with embed tags for sharing
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}): Promise<Metadata> {
  const { tokenId } = await params;
  // Use actual NFT image instead of placeholder
  const imageUrl = `${ROOT_URL}/api/nft-image/${tokenId}`;
  const pageUrl = `${ROOT_URL}/mint/${tokenId}`;

  // Create MiniApp embed JSON according to Farcaster docs
  const miniappEmbed = {
    version: "1",
    imageUrl: imageUrl,
    button: {
      title: "🎨 View NFT",
      action: {
        type: "launch_miniapp",
        url: pageUrl,
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

  return {
    title: `NFT #${tokenId} - ${minikitConfig.miniapp.name}`,
    description: `Check out this NFT minted on ${minikitConfig.miniapp.name}`,
    openGraph: {
      title: `NFT #${tokenId}`,
      description: `Minted on ${minikitConfig.miniapp.name}`,
      url: pageUrl,
      siteName: minikitConfig.miniapp.name,
      images: [
        {
          url: imageUrl,
          width: 600,
          height: 600,
          alt: `NFT #${tokenId}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `NFT #${tokenId} - ${minikitConfig.miniapp.name}`,
      description: `Check out this NFT minted on ${minikitConfig.miniapp.name}`,
      images: [imageUrl],
    },
    other: {
      "fc:miniapp": JSON.stringify(miniappEmbed),
      "fc:frame": JSON.stringify(frameEmbed), // Backward compatibility
    },
  };
}

export default function NFTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

