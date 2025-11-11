import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

const NFT_CONTRACT_ADDRESS = "0x6bD2277D11be1C4CE5Dc9B9682CE9E1cf8326f87" as const;

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

    // First, check if NFT exists by trying to get owner
    // If NFT doesn't exist, ownerOf will throw an error
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
    } catch {
      // NFT doesn't exist (ERC721NonexistentToken error)
      return NextResponse.json(
        { error: "NFT not found - This token has not been minted yet" },
        { status: 404 }
      );
    }

    // If owner is zero address, NFT doesn't exist
    if (!owner || owner === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "NFT not found - This token has not been minted yet" },
        { status: 404 }
      );
    }

    // Read tokenURI from contract
    let tokenURI: string;
    try {
      tokenURI = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
        ],
        functionName: "tokenURI",
        args: [BigInt(tokenIdNum)],
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to read tokenURI from contract" },
        { status: 500 }
      );
    }

    if (!tokenURI || tokenURI.trim() === "") {
      return NextResponse.json(
        { error: "Token URI not set for this NFT" },
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
    // Fix incorrect format: "data:image/png;base64,ipfs://..." -> "ipfs://..."
    if (metadata.image && typeof metadata.image === 'string') {
      // Handle HTML base64 (data:text/html;base64,...) - convert to PNG image endpoint for Basescan
      if (metadata.image.startsWith("data:text/html;base64,")) {
        // Extract FID from metadata to use as seed for fixed HTML base64
        let fid: string | undefined = undefined;
        const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
          attr.trait_type === "FID"
        );
        if (fidAttr && fidAttr.value) {
          fid = String(fidAttr.value);
        }
        
        // Convert HTML base64 to PNG image endpoint for Basescan compatibility
        // Basescan cannot display HTML base64 directly, so we use our canvas endpoint
        const rootUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_ROOT_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
        metadata.image = `${rootUrl}/api/nft-image/${tokenIdNum}`;
        console.log(`Converted HTML base64 to PNG image endpoint for Basescan compatibility (token ${tokenIdNum}, FID: ${fid || tokenIdNum})`);
      }
      // Fix incorrect format: "data:image/png;base64,<HTML base64>" - detect HTML content
      else if (metadata.image.startsWith("data:image/png;base64,")) {
        // Check if the base64 content is actually HTML (starts with "PHRtbWw" = base64 of "<html")
        const base64Content = metadata.image.replace("data:image/png;base64,", "");
        if (base64Content.startsWith("PHRtbWw") || base64Content.startsWith("PCFET0NUWVBFIGh0bWw")) {
          // This is HTML base64 incorrectly labeled as PNG - generate FIXED HTML base64
          let fid: string | undefined = undefined;
          const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
            attr.trait_type === "FID"
          );
          if (fidAttr && fidAttr.value) {
            fid = String(fidAttr.value);
          }
          
          // Convert HTML base64 to PNG image endpoint for Basescan compatibility
          // Basescan cannot display HTML base64 directly, so we use our canvas endpoint
          const rootUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_ROOT_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
          metadata.image = `${rootUrl}/api/nft-image/${tokenIdNum}`;
          console.log(`Converted incorrect HTML base64 labeled as PNG to PNG image endpoint for Basescan compatibility (token ${tokenIdNum}, FID: ${fid || tokenIdNum})`);
        } else {
          // This is actual PNG base64 - use canvas endpoint
          const rootUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_ROOT_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
          metadata.image = `${rootUrl}/api/nft-image/${tokenIdNum}`;
          console.log(`Converted PNG base64 to canvas endpoint for Basescan compatibility`);
        }
      }
      // Fix malformed image URL that combines data URI prefix with IPFS
      // Example: "data:image/png;base64,ipfs://QmcCMM..." -> extract IPFS hash
      else if (metadata.image.includes("data:image") && metadata.image.includes("ipfs://")) {
        // Extract IPFS hash from malformed URL
        const ipfsMatch = metadata.image.match(/ipfs:\/\/([a-zA-Z0-9]+)/);
        if (ipfsMatch && ipfsMatch[1]) {
          const ipfsHash = ipfsMatch[1];
          // Convert to HTTP URL for Basescan compatibility
          metadata.image = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
          console.log(`Fixed malformed image URL: extracted IPFS hash ${ipfsHash} and converted to HTTP URL`);
        }
      }
      // Convert IPFS protocol URL to HTTP URL for display
      else if (metadata.image.startsWith("ipfs://")) {
        const ipfsHash = metadata.image.replace("ipfs://", "");
        metadata.image = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      }
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

