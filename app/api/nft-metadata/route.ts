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

    // Validate tokenId is a valid number
    const tokenIdNum = tokenId.trim();
    if (!/^\d+$/.test(tokenIdNum)) {
      return NextResponse.json(
        { error: "tokenId must be a valid number" },
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
      args: [BigInt(tokenIdNum)],
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

    // Fetch metadata JSON with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let metadataResponse: Response;
    try {
      metadataResponse = await fetch(metadataUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: "Request timeout: Failed to fetch metadata" },
          { status: 504 }
        );
      }
      throw error;
    }
    
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

    let metadata: {
      name?: string;
      description?: string;
      image?: string;
      attributes?: Array<{ trait_type: string; value: string | number }>;
      [key: string]: unknown;
    };
    try {
      metadata = await metadataResponse.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON response from metadata URL" },
        { status: 500 }
      );
    }

    // Validate metadata structure
    if (!metadata || typeof metadata !== 'object') {
      return NextResponse.json(
        { error: "Invalid metadata format" },
        { status: 500 }
      );
    }

    // Ensure image URL is properly formatted (convert IPFS to HTTP if needed)
    if (metadata.image && typeof metadata.image === 'string' && metadata.image.startsWith("ipfs://")) {
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

