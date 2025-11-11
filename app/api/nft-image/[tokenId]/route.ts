import { NextRequest, NextResponse } from "next/server";
import { createCanvas } from "canvas";
import { generateArt } from "../../../../lib/p5-art-generator";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

const NFT_CONTRACT_ADDRESS = "0x03Fa16B149D2a4E1BDBF65d0bDf4284C65557000" as const;

// Create public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

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

    // First, fetch metadata to get FID (which is used as seed in contract)
    // This ensures the generated art matches what's stored in the contract
    let fid: string | undefined = undefined;
    try {
      const tokenURI = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
        ],
        functionName: "tokenURI",
        args: [BigInt(tokenIdNum)],
      });

      if (tokenURI) {
        // Convert IPFS URL to HTTP URL if needed
        let metadataUrl = tokenURI;
        if (tokenURI.startsWith("ipfs://")) {
          const ipfsHash = tokenURI.replace("ipfs://", "");
          metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        } else if (tokenURI.startsWith("data:application/json;base64,")) {
          // Handle base64 encoded metadata
          const base64Data = tokenURI.replace("data:application/json;base64,", "");
          const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
          const metadata = JSON.parse(jsonStr);
          const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
            attr.trait_type === "FID"
          );
          if (fidAttr && fidAttr.value) {
            fid = String(fidAttr.value);
          }
        } else {
          // Try to fetch metadata from HTTP URL
          const metadataResponse = await fetch(metadataUrl);
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
              attr.trait_type === "FID"
            );
            if (fidAttr && fidAttr.value) {
              fid = String(fidAttr.value);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Could not fetch FID from metadata, using tokenId as seed:", error);
    }

    // Generate canvas art using FID as seed (matches contract generation), or tokenId as fallback
    // Create canvas using node-canvas (reduced to 450x450 for minimum file size)
    const canvas = createCanvas(450, 450);
    
    // Generate art on canvas
    // Use FID as seed if available (matches contract), otherwise use tokenId
    const seed = fid || tokenIdNum;
    try {
      generateArt(canvas as unknown as HTMLCanvasElement, { tokenId: seed });
      
      // Convert canvas to PNG buffer (200x200 for minimum file size)
      // PNG format with 200x200 resolution = smallest possible file size
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

