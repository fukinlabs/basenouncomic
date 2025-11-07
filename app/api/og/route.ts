import { NextRequest, NextResponse } from "next/server";

// Generate dynamic OG image for NFT
// According to Farcaster docs: 3:2 aspect ratio, min 600x400px, max 3000x2000px
// Note: The actual art is generated client-side using p5.js code
// This endpoint returns a placeholder that references the art generator
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenId = searchParams.get("tokenId") || "0";

  // Image dimensions: 1200x800 (3:2 aspect ratio)
  const width = 1200;
  const height = 800;

  // Create SVG image with reference to the art
  // The actual art will be generated client-side and embedded as base64
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect x="300" y="100" width="600" height="600" fill="#E3E3E3" rx="10"/>
      <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
        NFT #${tokenId}
      </text>
      <text x="50%" y="90%" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)" text-anchor="middle" dominant-baseline="middle">
        Generative Art NFT
      </text>
    </svg>
  `.trim();
  
  // Set cache headers as recommended in Farcaster docs
  // Use max-age for caching dynamic images
  const headers = new Headers();
  headers.set("Content-Type", "image/svg+xml");
  headers.set("Cache-Control", "public, immutable, no-transform, max-age=300");

  return new NextResponse(svg, { headers });
}

