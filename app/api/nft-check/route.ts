import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { NFT_CONTRACT_ADDRESS } from "../../../lib/contract-config";

// Create public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * API Route to check NFT by tokenId
 * 
 * This endpoint uses ownerOf(tokenId) to verify NFT exists and get owner
 * Example: /api/nft-check?tokenId=0
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tokenId = searchParams.get("tokenId");

    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    // Validate tokenId is a valid number (including "0")
    const tokenIdNum = tokenId.trim();
    if (!/^\d+$/.test(tokenIdNum)) {
      return NextResponse.json(
        { error: "tokenId must be a valid number" },
        { status: 400 }
      );
    }

    // Check if NFT exists using ownerOf
    // ✅ Accept tokenId = 0 (first NFT minted)
    let owner: string;
    try {
      owner = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function ownerOf(uint256 tokenId) view returns (address)"),
        ],
        functionName: "ownerOf",
        args: [BigInt(tokenIdNum)],
      });
    } catch (error) {
      // NFT doesn't exist (ERC721NonexistentToken error)
      return NextResponse.json(
        { 
          error: "NFT not found - This token has not been minted yet",
          tokenId: tokenIdNum,
          exists: false
        },
        { status: 404 }
      );
    }

    // If owner is zero address, NFT doesn't exist
    if (!owner || owner === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { 
          error: "NFT not found - This token has not been minted yet",
          tokenId: tokenIdNum,
          exists: false
        },
        { status: 404 }
      );
    }

    // Get tokenURI to extract FID
    let tokenURI: string;
    let fid: string | undefined = undefined;
    try {
      tokenURI = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
        ],
        functionName: "tokenURI",
        args: [BigInt(tokenIdNum)],
      });

      // Parse metadata to get FID
      if (tokenURI.startsWith("data:application/json;base64,")) {
        const base64Data = tokenURI.replace("data:application/json;base64,", "");
        const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
        const metadata = JSON.parse(jsonStr);
        const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
          attr.trait_type === "FID"
        );
        if (fidAttr && fidAttr.value) {
          fid = String(fidAttr.value);
        }
      }
    } catch (error) {
      console.warn("Could not fetch tokenURI:", error);
    }

    return NextResponse.json({
      tokenId: tokenIdNum,
      owner,
      fid,
      exists: true,
      contractAddress: NFT_CONTRACT_ADDRESS,
    });
  } catch (error) {
    console.error("Error checking NFT:", error);
    return NextResponse.json(
      { 
        error: "Failed to check NFT", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

