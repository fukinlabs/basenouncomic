import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, parseEventLogs } from "viem";
import { base } from "viem/chains";

const NFT_CONTRACT_ADDRESS = "0x03Fa16B149D2a4E1BDBF65d0bDf4284C65557000" as const;

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

    // Search for all MintForFID events
    // Search from contract deployment (block 0) to latest
    const fromBlock = BigInt(0); // Start from contract deployment

    const logs = await publicClient.getLogs({
      address: NFT_CONTRACT_ADDRESS,
      event: parseAbiItem("event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid)"),
      fromBlock,
      toBlock: "latest",
    });

    // Parse all events
    const parsedLogs = parseEventLogs({
      abi: [
        parseAbiItem("event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid)"),
      ],
      eventName: "MintForFID",
      logs,
    });

    // Extract NFT data from events
    const nfts = parsedLogs.map((log) => {
      const event = log as { args?: { tokenId?: bigint; to?: string; fid?: bigint } };
      return {
        tokenId: event.args?.tokenId?.toString() || "0",
        owner: event.args?.to || "",
        fid: event.args?.fid?.toString() || "0",
      };
    });

    // Sort by tokenId (newest first)
    nfts.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));

    // Apply pagination
    const paginatedNFTs = nfts.slice(offset, offset + limit);

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

