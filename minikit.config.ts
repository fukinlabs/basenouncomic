const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const minikitConfig = {
  accountAssociation: {
    // Skip for now - will be configured later
    "header": "eyJmaWQiOjI5MDY1NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDVhZjI2MWZFMmQyMENCODhEQzNkNTVmMzAzNzE2NWJGMWQ5NzIwNmMifQ",
    "payload": "eyJkb21haW4iOiJiYWxkZ2FtZS1waS52ZXJjZWwuYXBwIn0",
    "signature": "8YAV6BrflDvOWNN2vc62ykxZAwLdaKhiV95UUcyqfHZCJhntVEwK3xwPDRqn4JFaCvut7AO6By94kYZ6AZXy1Rs="

  },
  miniapp: {
    version: "1",
    name: "basenouncomic",
     subtitle: "Your AI Ad Companion", 
    description: "Ads",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/splash.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#D53C5E",
    homeUrl: ROOT_URL,
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

