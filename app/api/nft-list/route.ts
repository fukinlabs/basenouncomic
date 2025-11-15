import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, parseEventLogs } from "viem";
import { base } from "viem/chains";
import { NFT_CONTRACT_ADDRESS } from "../../../lib/contract-config";

// Create public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * API Route to get list of all NFTs
 * 
 * This endpoint searches for all MintForFID events to get all minted NFTs
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get nextId to know total supply
    let totalSupply = 0;
    try {
      const nextId = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function nextId() view returns (uint256)"),
        ],
        functionName: "nextId",
      });
      totalSupply = Number(nextId);
    } catch {
      // If nextId doesn't exist, we'll search events
    }

    // Method 1: Use nextId to get all minted NFTs (more efficient)
    // Loop through tokenId from 0 to nextId-1 and check ownerOf
    const nfts: Array<{ tokenId: string; owner: string; fid?: string }> = [];
    
    if (totalSupply > 0) {
      // Fetch all NFTs using ownerOf (from tokenId 0 to nextId-1)
      // ✅ Accept tokenId = 0 (first NFT minted)
      for (let i = 0; i < totalSupply; i++) {
        try {
          const owner = await publicClient.readContract({
            address: NFT_CONTRACT_ADDRESS,
            abi: [
              parseAbiItem("function ownerOf(uint256 tokenId) view returns (address)"),
            ],
            functionName: "ownerOf",
            args: [BigInt(i)],
          });
          
          // If owner is not zero address, NFT exists
          if (owner && owner !== "0x0000000000000000000000000000000000000000") {
            // Try to get FID from metadata
            let fid: string | undefined = undefined;
            try {
              const tokenURI = await publicClient.readContract({
                address: NFT_CONTRACT_ADDRESS,
                abi: [
                  parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
                ],
                functionName: "tokenURI",
                args: [BigInt(i)],
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
            } catch (metadataError) {
              // If metadata fetch fails, continue without FID
              console.warn(`Could not fetch metadata for tokenId ${i}:`, metadataError);
            }
            
            const tokenIdStr = String(i);
            // Validate tokenId before adding
            if (!/^\d+$/.test(tokenIdStr)) {
              console.warn(`[nft-list] Invalid tokenId format: ${tokenIdStr}, skipping`);
              continue;
            }
            
            nfts.push({
              tokenId: tokenIdStr,
              owner,
              fid,
            });
            
            console.log(`[nft-list] Added NFT: tokenId=${tokenIdStr}, owner=${owner}, fid=${fid || 'N/A'}`);
          }
        } catch (error) {
          // If ownerOf fails, NFT doesn't exist (skip it)
          // This can happen if there are gaps in tokenId sequence
          console.warn(`TokenId ${i} does not exist:`, error);
          continue;
        }
      }
    } else {
      // Fallback: Search for Mint events if nextId is not available
      const fromBlock = BigInt(0);
      
      try {
        const logs = await publicClient.getLogs({
          address: NFT_CONTRACT_ADDRESS,
          event: parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)"),
          fromBlock,
          toBlock: "latest",
        });

        // Parse all events
        const parsedLogs = parseEventLogs({
          abi: [
            parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)"),
          ],
          eventName: "Mint",
          logs,
        });

        // Extract NFT data from events
        parsedLogs.forEach((log) => {
          const event = log as { args?: { tokenId?: bigint; to?: string; fid?: bigint } };
          const tokenId = event.args?.tokenId?.toString();
          if (tokenId && /^\d+$/.test(tokenId)) {
            const tokenIdStr = tokenId.trim();
            // Double validate tokenId
            if (/^\d+$/.test(tokenIdStr)) {
              nfts.push({
                tokenId: tokenIdStr,
                owner: event.args?.to || "",
                fid: event.args?.fid?.toString(),
              });
              console.log(`[nft-list] Added NFT from event: tokenId=${tokenIdStr}, owner=${event.args?.to || 'N/A'}, fid=${event.args?.fid?.toString() || 'N/A'}`);
            } else {
              console.warn(`[nft-list] Invalid tokenId from event: ${tokenId}, skipping`);
            }
          } else {
            console.warn(`[nft-list] Invalid tokenId format from event: ${tokenId}, skipping`);
          }
        });
      } catch (eventError) {
        console.error("Error fetching Mint events:", eventError);
      }
    }

    // Sort by tokenId (newest first)
    nfts.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));

    console.log(`[nft-list] Found ${nfts.length} NFTs, totalSupply: ${totalSupply}, offset: ${offset}, limit: ${limit}`);

    // Apply pagination
    const paginatedNFTs = nfts.slice(offset, offset + limit);

    console.log(`[nft-list] Paginated NFTs: ${paginatedNFTs.length} NFTs (from ${offset} to ${offset + limit})`);

    // If we have nextId, use it for total supply
    if (totalSupply === 0) {
      totalSupply = nfts.length;
    }

    return NextResponse.json({
      nfts: paginatedNFTs,
      total: totalSupply,
      limit,
      offset,
      hasMore: offset + limit < totalSupply,
    });
  } catch (error) {
    console.error("Error fetching NFT list:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch NFT list", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

