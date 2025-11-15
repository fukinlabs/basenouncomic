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

    // Smart contract uses tokenId = nextId++ (sequential: 0, 1, 2, 3...)
    // FID is stored in tokenURI metadata attributes, not as tokenId
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

    // Read tokenURI from contract using tokenId (tokenId = nextId++, FID is in metadata)
    let tokenURI: string;
    try {
      tokenURI = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
        ],
        functionName: "tokenURI",
        args: [BigInt(tokenIdNum)], // tokenId = nextId++ (0, 1, 2, 3...), FID is in tokenURI metadata
      });
      console.log(`[nft-metadata] Successfully read tokenURI for tokenId ${tokenIdNum}, length: ${tokenURI?.length || 0}`);
    } catch (error) {
      console.error(`[nft-metadata] Error reading tokenURI for tokenId ${tokenIdNum}:`, error);
      return NextResponse.json(
        { 
          error: "Failed to read tokenURI from contract",
          details: error instanceof Error ? error.message : String(error),
          tokenId: tokenIdNum
        },
        { status: 500 }
      );
    }

    if (!tokenURI || tokenURI.trim() === "") {
      return NextResponse.json(
        { error: "Token URI not set for this NFT" },
        { status: 404 }
      );
    }

    // Handle base64 encoded tokenURI (data:application/json;base64,...)
    let metadata: {
      name?: string;
      description?: string;
      image?: string;
      attributes?: Array<{ trait_type: string; value: string | number }>;
      [key: string]: unknown;
    };
    
    if (tokenURI.startsWith("data:application/json;base64,")) {
      // TokenURI is base64 encoded JSON - decode it directly
      try {
        const base64Data = tokenURI.replace("data:application/json;base64,", "");
        const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
        console.log(`[nft-metadata] Decoded base64 tokenURI for tokenId ${tokenIdNum}, JSON length: ${jsonStr.length}`);
        metadata = JSON.parse(jsonStr);
      } catch (error) {
        console.error(`[nft-metadata] Error decoding base64 tokenURI for tokenId ${tokenIdNum}:`, error);
        return NextResponse.json(
          { 
            error: "Failed to decode base64 tokenURI",
            details: error instanceof Error ? error.message : String(error),
            tokenId: tokenIdNum
          },
          { status: 500 }
        );
      }
    } else {
      // TokenURI is a URL (IPFS or HTTP) - fetch it
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
        console.log(`[nft-metadata] Fetching metadata from URL: ${metadataUrl}`);
        metadataResponse = await fetch(metadataUrl, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          console.error(`[nft-metadata] Timeout fetching metadata for tokenId ${tokenIdNum}`);
          return NextResponse.json(
            { 
              error: "Request timeout: Failed to fetch metadata",
              tokenId: tokenIdNum,
              url: metadataUrl
            },
            { status: 504 }
          );
        }
        console.error(`[nft-metadata] Error fetching metadata for tokenId ${tokenIdNum}:`, error);
        throw error;
      }
      
      if (!metadataResponse.ok) {
        console.error(`[nft-metadata] Metadata fetch failed for tokenId ${tokenIdNum}: ${metadataResponse.status} ${metadataResponse.statusText}`);
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
        
        const errorText = await metadataResponse.text().catch(() => "Unknown error");
        return NextResponse.json(
          { 
            error: "Failed to fetch metadata",
            details: errorText,
            status: metadataResponse.status,
            tokenId: tokenIdNum,
            url: metadataUrl
          },
          { status: metadataResponse.status }
        );
      }

      try {
        metadata = await metadataResponse.json();
        console.log(`[nft-metadata] Successfully parsed metadata for tokenId ${tokenIdNum}`);
      } catch (error) {
        console.error(`[nft-metadata] Error parsing JSON response for tokenId ${tokenIdNum}:`, error);
        return NextResponse.json(
          { 
            error: "Invalid JSON response from metadata URL",
            details: error instanceof Error ? error.message : String(error),
            tokenId: tokenIdNum,
            url: metadataUrl
          },
          { status: 500 }
        );
      }
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
    console.error(`[nft-metadata] Unexpected error fetching NFT metadata for tokenId ${request.nextUrl.searchParams.get("tokenId")}:`, error);
    return NextResponse.json(
      { 
        error: "Failed to fetch NFT metadata", 
        details: error instanceof Error ? error.message : String(error),
        tokenId: request.nextUrl.searchParams.get("tokenId") || "unknown"
      },
      { status: 500 }
    );
  }
}

