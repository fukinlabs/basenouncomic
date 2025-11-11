import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { generateHTMLCanvasBase64 } from "../../../../lib/generate-html-canvas";

const NFT_CONTRACT_ADDRESS = "0x007476B27457Ae45C2C5fB30B4E26844E2B5387A" as const;

// Create public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * API Route to serve fixed HTML base64 for NFTs
 * 
 * This endpoint:
 * 1. Fetches metadata from contract
 * 2. Extracts FID from metadata
 * 3. Generates NEW HTML base64 with fixed seed counter logic
 * 4. Returns the fixed HTML base64
 * 
 * This fixes the issue where old minted NFTs have HTML base64 that changes on refresh
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

    // First, check if NFT exists
    try {
      await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function ownerOf(uint256 tokenId) view returns (address)"),
        ],
        functionName: "ownerOf",
        args: [BigInt(tokenIdNum)],
      });
    } catch {
      return NextResponse.json(
        { error: "NFT not found" },
        { status: 404 }
      );
    }

    // Fetch metadata to extract FID
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
          const metadataResponse = await fetch(metadataUrl, {
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });
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

    // Generate NEW HTML base64 with fixed seed counter logic
    // Use FID as seed if available (matches original minting), otherwise use tokenId
    const seed = fid || tokenIdNum;
    const fixedHtmlBase64 = generateHTMLCanvasBase64({ tokenId: seed });

    // Return the fixed HTML base64
    return NextResponse.json({
      tokenId: tokenIdNum,
      fid: fid || null,
      htmlBase64: fixedHtmlBase64,
      htmlDataUri: `data:text/html;base64,${fixedHtmlBase64}`,
    });
  } catch (error) {
    console.error("Error generating fixed HTML base64:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate fixed HTML base64", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

