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
    // First, check if NFT exists by trying to get owner (with retry for better reliability)
    let owner: string | undefined = undefined;
    
    const maxRetries = 3;
    let lastOwnerError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[nft-metadata] 🔍 Checking NFT existence (attempt ${attempt}/${maxRetries}) for tokenId ${tokenIdNum}`);
        
        owner = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS,
          abi: [
            parseAbiItem("function ownerOf(uint256 tokenId) view returns (address)"),
          ],
          functionName: "ownerOf",
          args: [BigInt(tokenIdNum)],
        });
        
        console.log(`[nft-metadata] ✅ NFT exists, owner: ${owner}`);
        break; // Success, exit retry loop
        
      } catch (error) {
        lastOwnerError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[nft-metadata] ⚠️ ownerOf attempt ${attempt}/${maxRetries} failed:`, {
          error: lastOwnerError.message,
          tokenId: tokenIdNum,
          contractAddress: NFT_CONTRACT_ADDRESS
        });
        
        // If it's the last attempt, check if this is a "not exists" error
        if (attempt === maxRetries) {
          // Check if error indicates NFT doesn't exist vs network/RPC issues
          if (lastOwnerError.message.includes('ERC721NonexistentToken') || 
              lastOwnerError.message.includes('owner query for nonexistent token')) {
            return NextResponse.json(
              { 
                error: "NFT not found - This token has not been minted yet",
                tokenId: tokenIdNum
              },
              { status: 404 }
            );
          } else {
            // Network/RPC error - return 503 for retry
            return NextResponse.json(
              { 
                error: "RPC service temporarily unavailable. Please try again.",
                details: lastOwnerError.message,
                tokenId: tokenIdNum,
                contractAddress: NFT_CONTRACT_ADDRESS
              },
              { status: 503 }
            );
          }
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000); // 1s, 2s, 3s max
          console.log(`[nft-metadata] 💤 Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Check if owner was successfully retrieved
    if (!owner) {
      return NextResponse.json(
        { 
          error: "Failed to verify NFT ownership after multiple retries",
          tokenId: tokenIdNum,
          attempts: maxRetries
        },
        { status: 503 }
      );
    }

    // If owner is zero address, NFT doesn't exist
    if (owner === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { error: "NFT not found - This token has not been minted yet" },
        { status: 404 }
      );
    }

    // Read tokenURI from contract using tokenId (with retry for better reliability)
    let tokenURI: string | undefined = undefined;
    let lastTokenURIError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[nft-metadata] 📄 Reading tokenURI (attempt ${attempt}/${maxRetries}) for tokenId ${tokenIdNum}`);
        
        tokenURI = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS,
          abi: [
            parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
          ],
          functionName: "tokenURI",
          args: [BigInt(tokenIdNum)], // tokenId = nextId++ (0, 1, 2, 3...), FID is in tokenURI metadata
        });
        
        console.log(`[nft-metadata] ✅ Successfully read tokenURI for tokenId ${tokenIdNum}:`, {
          length: tokenURI?.length || 0,
          type: tokenURI?.startsWith('data:') ? 'base64_encoded' : 'url',
          preview: tokenURI?.substring(0, 50) + (tokenURI?.length > 50 ? '...' : '')
        });
        
        break; // Success, exit retry loop
        
      } catch (error) {
        lastTokenURIError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[nft-metadata] ⚠️ tokenURI attempt ${attempt}/${maxRetries} failed:`, {
          error: lastTokenURIError.message,
          tokenId: tokenIdNum,
          contractAddress: NFT_CONTRACT_ADDRESS
        });
        
        // If it's the last attempt, return error
        if (attempt === maxRetries) {
          return NextResponse.json(
            { 
              error: "Failed to read tokenURI from contract after multiple retries",
              details: lastTokenURIError.message,
              tokenId: tokenIdNum,
              contractAddress: NFT_CONTRACT_ADDRESS,
              attempts: maxRetries
            },
            { status: 503 } // Service unavailable - RPC issues
          );
        }
        
        // Wait before retry
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
          console.log(`[nft-metadata] 💤 Waiting ${waitTime}ms before tokenURI retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Check if tokenURI was successfully retrieved
    if (!tokenURI) {
      return NextResponse.json(
        { 
          error: "Failed to read tokenURI after multiple retries",
          tokenId: tokenIdNum,
          attempts: maxRetries
        },
        { status: 503 }
      );
    }

    if (tokenURI.trim() === "") {
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
      // TokenURI is base64 encoded JSON - decode it directly (from smart contract)
      try {
        const base64Data = tokenURI.replace("data:application/json;base64,", "");
        const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
        console.log(`[nft-metadata] ✅ Successfully decoded base64 tokenURI for tokenId ${tokenIdNum}:`, {
          jsonLength: jsonStr.length,
          source: 'smart_contract_base64', // ข้อมูลมาจาก contract โดยตรง ไม่ใช่ Pinata
          preview: jsonStr.substring(0, 100) + (jsonStr.length > 100 ? '...' : '')
        });
        metadata = JSON.parse(jsonStr);
        
        // Log metadata details for debugging
        console.log(`[nft-metadata] 📋 Metadata details for tokenId ${tokenIdNum}:`, {
          name: metadata.name,
          hasImage: !!metadata.image,
          imageType: metadata.image?.startsWith('data:') ? 'base64' : 'url',
          attributesCount: metadata.attributes?.length || 0,
          fid: metadata.attributes?.find(attr => attr.trait_type === 'FID')?.value
        });
      } catch (error) {
        console.error(`[nft-metadata] ❌ Error decoding base64 tokenURI for tokenId ${tokenIdNum}:`, {
          error: error instanceof Error ? error.message : String(error),
          base64Length: tokenURI.length,
          reason: 'json_parse_failed'
        });
        return NextResponse.json(
          { 
            error: "Failed to decode base64 tokenURI from smart contract",
            details: error instanceof Error ? error.message : String(error),
            tokenId: tokenIdNum,
            source: 'smart_contract_base64'
          },
          { status: 500 }
        );
      }
    } else {
      // TokenURI is a URL (IPFS or HTTP) - fetch it with retry and fallback gateways
      const metadataUrl = tokenURI;
      let ipfsHash: string | null = null;
      
      if (tokenURI.startsWith("ipfs://")) {
        ipfsHash = tokenURI.replace("ipfs://", "");
      }

      // IPFS Gateway URLs (priority order: Pinata → Cloudflare → IPFS.io)
      const ipfsGateways = [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
      ];

      // Fetch metadata JSON with retry and fallback gateways
      let metadataResponse: Response | null = null;
      let lastError: Error | null = null;
      const maxRetries = 3;
      const timeout = 15000; // 15 second timeout (increased from 10s)
      
      // If IPFS hash, try multiple gateways; otherwise use original URL
      const urlsToTry = ipfsHash ? ipfsGateways : [metadataUrl];
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        for (const url of urlsToTry) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          try {
            console.log(`[nft-metadata] Fetching metadata from URL (attempt ${attempt + 1}/${maxRetries}): ${url}`);
            metadataResponse = await fetch(url, {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'NFT-Metadata-Fetcher/1.0',
              },
            });
            clearTimeout(timeoutId);
            
            // If successful, break out of loops
            if (metadataResponse.ok) {
              console.log(`[nft-metadata] Successfully fetched metadata from ${url} for tokenId ${tokenIdNum}`);
              break;
            } else {
              // If rate limited (429), wait before retrying
              if (metadataResponse.status === 429) {
                const retryAfter = metadataResponse.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 1000;
                console.warn(`[nft-metadata] Rate limited (429) on ${url}, waiting ${waitTime}ms before retry`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
              // If 404, try next gateway (if IPFS)
              if (metadataResponse.status === 404 && ipfsHash && urlsToTry.length > 1) {
                console.warn(`[nft-metadata] 404 on ${url}, trying next gateway...`);
                continue;
              }
              // For other errors, throw to retry
              throw new Error(`HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`);
            }
          } catch (error) {
            clearTimeout(timeoutId);
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (error instanceof Error && error.name === 'AbortError') {
              console.warn(`[nft-metadata] Timeout fetching metadata from ${url} (attempt ${attempt + 1})`);
            } else {
              console.warn(`[nft-metadata] Error fetching metadata from ${url} (attempt ${attempt + 1}):`, error);
            }
            
            // If not last attempt, wait before retrying
            if (attempt < maxRetries - 1) {
              const waitTime = (attempt + 1) * 1000; // Exponential backoff: 1s, 2s, 3s
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            // Continue to next URL or retry
            continue;
          }
        }
        
        // If we got a successful response, break out of retry loop
        if (metadataResponse && metadataResponse.ok) {
          break;
        }
      }
      
      // If all attempts failed
      if (!metadataResponse || !metadataResponse.ok) {
        console.error(`[nft-metadata] Failed to fetch metadata after ${maxRetries} attempts for tokenId ${tokenIdNum}`);
        
        // If metadata fetch fails, try to extract image from tokenURI directly
        // (in case tokenURI is just an image URL)
        if (ipfsHash) {
          const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
          return NextResponse.json({
            image: imageUrl,
            name: `NFT #${tokenId}`,
            description: "NFT from contract",
            attributes: [],
          });
        }
        
        const errorMessage = lastError?.message || "Unknown error";
        return NextResponse.json(
          { 
            error: "Failed to fetch metadata after multiple attempts",
            details: errorMessage,
            tokenId: tokenIdNum,
            urlsTried: urlsToTry
          },
          { status: 504 }
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
            url: metadataResponse.url
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
      // Use Pinata Gateway as primary, but fallback to other gateways if needed
      else if (metadata.image.startsWith("ipfs://")) {
        const ipfsHash = metadata.image.replace("ipfs://", "");
        // Use Pinata Gateway as primary (most reliable)
        metadata.image = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      }
    }

    // Return metadata along with owner information
    return NextResponse.json({
      ...metadata,
      owner: owner // เพิ่ม owner address ที่ได้จาก ownerOf call
    });
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

