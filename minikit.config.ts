const ROOT_URL =
  process.env.NEXT_PUBLIC_ROOT_URL ||
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://farcasterabstact.wtf');

export const minikitConfig = {
  miniapp: {
    version: "1",
    name: "Farcaster Abstract P5",
     subtitle: "AI Nouns Companion for P5js", 
    description: "AI Generative Nouns Companion",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/splash.png`,
    splashImageUrl: `${ROOT_URL}/monkey.gif`,
    splashBackgroundColor: "#2f3057",
    homeUrl: `${ROOT_URL}/mint`,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "art-creativity",
    tags: ["art", "ai", "generative", "nft"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "AI Generative Art Companion",
    ogTitle: "Farcaster Abstract P5 - AI Art",
    ogDescription: "Create generative AI art with Nouns companion",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
} as const;

