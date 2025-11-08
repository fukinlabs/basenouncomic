const ROOT_URL = process.env.NEXT_PUBLIC_ROOT_URL || "http://localhost:3000";

export const minikitConfig = {
  accountAssociation: {
    // Skip for now - will be configured later
    header: "",
    payload: "",
    signature: ""
  },
  miniapp: {
    version: "1",
    name: "basenouncomic",
    subtitle: "A Next.js Web3 game",
    description: "A Next.js application with Web3 and Farcaster integration",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#FFFFFF",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["game", "web3", "farcaster"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "Play, Connect, Earn",
    ogTitle: "Blad Gamet - Web3 Game on Farcaster",
    ogDescription: "A Next.js application with Web3 and Farcaster integration",
    ogImageUrl: `${ROOT_URL}/og-image.png`,
  },
} as const;

