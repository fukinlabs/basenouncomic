const ROOT_URL =
  process.env.NEXT_PUBLIC_ROOT_URL ||
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://farcasterabstact.wtf');

export const minikitConfig = {
  accountAssociation: {
    "header": "eyJmaWQiOjI5MDY1NCwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDhBNDhBNzYzNTY5QTc5Nzg2OTZGN2Y0MkRkYkY0RjdBNTVhM2I1ZDIifQ",
    "payload": "eyJkb21haW4iOiJmYXJjYXN0ZXJhYnN0YWN0Lnd0ZiJ9",
    "signature": "ZoNdUDpagnxJCcX+d3mUVVtRuyRv6eLCj3/QM/Dn9v1dXYn26LD9bA6zsH9yusAOztphk+PPi0yn5boPg7l7WBs="
   },
  miniapp: {
    version: "1",
    name: "wwwwww Farcaster Abstract P5",
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

