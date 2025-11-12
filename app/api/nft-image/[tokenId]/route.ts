import { NextRequest, NextResponse } from "next/server";
import { createCanvas } from "canvas";
import { generateArt } from "../../../../lib/p5-art-generator";
// Keep imports for potential future use (e.g., verifying tokenURI from contract)
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { NFT_CONTRACT_ADDRESS } from "../../../../lib/contract-config";

// Create public client for Base (kept for potential future use)
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * API Route to serve NFT images
 * 
 * This endpoint reads tokenURI from contract, fetches metadata,
 * and converts base64 images to HTTP URLs for Basescan compatibility
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;

    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    // Validate tokenId is a valid number
    const tokenIdNum = tokenId.trim();
    if (!/^\d+$/.test(tokenIdNum)) {
      return NextResponse.json(
        { error: "tokenId must be a valid number" },
        { status: 400 }
      );
    }

    // Smart contract uses tokenId = FID, so use tokenId directly as FID
    // This ensures the generated art matches what's stored in the contract
    const fid = tokenIdNum; // tokenId = FID in this contract
    
    // Generate canvas art using FID (which equals tokenId) as seed
    // Create canvas using node-canvas (600x600 for higher quality)
    const canvas = createCanvas(600, 600);
    
    // Generate art on canvas
    // Use FID as seed if available (matches contract), otherwise use tokenId
    const seed = fid || tokenIdNum;
    try {
      generateArt(canvas as unknown as HTMLCanvasElement, { tokenId: seed });
      
      // Convert canvas to PNG buffer (600x600)
      // PNG format with 600x600 resolution
      const buffer = canvas.toBuffer("image/png");
      
      // Convert Buffer to Uint8Array for NextResponse compatibility
      const uint8Array = new Uint8Array(buffer);
      
      // Return image with proper content type
      const headers = new Headers();
      headers.set("Content-Type", "image/png");
      headers.set("Cache-Control", "public, immutable, max-age=31536000");
      
      return new NextResponse(uint8Array, { headers });
    } catch (error) {
      console.error("Error generating canvas art:", error);
      // Fallback: return 404 if art generation fails
      return NextResponse.json(
        { error: "Failed to generate canvas art", details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching NFT image:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch NFT image", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

