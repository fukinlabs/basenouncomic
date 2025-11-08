import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

const NFT_CONTRACT_ADDRESS = "0xe81B2748149d089eBdaE6Fee36230D98BA00FF49" as const;

// Create public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * API Route to get NFT metadata from contract
 * 
 * This endpoint reads tokenURI from the contract and fetches the metadata JSON
 * Supports both IPFS URLs (ipfs://) and HTTP URLs
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

    // Read tokenURI from contract
    const tokenURI = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: [
        parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
      ],
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    });

    if (!tokenURI) {
      return NextResponse.json(
        { error: "Token not found or no URI set" },
        { status: 404 }
      );
    }

    // Convert IPFS URL to HTTP URL if needed
    let metadataUrl = tokenURI;
    if (tokenURI.startsWith("ipfs://")) {
      const ipfsHash = tokenURI.replace("ipfs://", "");
      metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    }

    // Fetch metadata JSON
    const metadataResponse = await fetch(metadataUrl);
    
    if (!metadataResponse.ok) {
      // If metadata fetch fails, try to extract image from tokenURI directly
      // (in case tokenURI is just an image URL)
      if (tokenURI.startsWith("ipfs://")) {
        const ipfsHash = tokenURI.replace("ipfs://", "");
        const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        return NextResponse.json({
          image: imageUrl,
          name: `NFT #${tokenId}`,
          description: "NFT from contract",
        });
      }
      
      return NextResponse.json(
        { error: "Failed to fetch metadata", details: await metadataResponse.text() },
        { status: metadataResponse.status }
      );
    }

    const metadata = await metadataResponse.json();

    // Ensure image URL is properly formatted (convert IPFS to HTTP if needed)
    if (metadata.image && metadata.image.startsWith("ipfs://")) {
      const ipfsHash = metadata.image.replace("ipfs://", "");
      metadata.image = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    }

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Error fetching NFT metadata:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch NFT metadata", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

