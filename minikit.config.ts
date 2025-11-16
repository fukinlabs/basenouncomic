const ROOT_URL =
  process.env.NEXT_PUBLIC_ROOT_URL ||
  process.env.NEXT_PUBLIC_URL ||
  'https://farcasterabstact.wtf';

export const minikitConfig = {
  accountAssociation: {
    "header": "eyJmaWQiOjI5MDY1NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDVhZjI2MWZFMmQyMENCODhEQzNkNTVmMzAzNzE2NWJGMWQ5NzIwNmMifQ",
    "payload": "eyJkb21haW4iOiJmYXJjYXN0ZXJhYnN0YWN0Lnd0ZiJ9",
    "signature": "nTviqxTq+oSbYRB2TKghc6eBdGdOKIw8XIDwsjfCOMY82G1Q/cimp+l3hdQfquNImlpHLMG5T/znlJvCoaZsghw="
  },
  miniapp: {
    version: "1",
    name: "Farcaster Abstract P5",
     subtitle: "P5js AI Nouns Companion", 
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
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
} as const;

