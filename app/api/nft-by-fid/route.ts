import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, parseEventLogs, type Log } from "viem";
import { base } from "viem/chains";
import { NFT_CONTRACT_ADDRESS } from "../../../lib/contract-config";

// Create public client for Base with fallback RPC endpoints
// Using public RPC endpoints for better reliability
// Priority: BASE_RPC_URL env var > Base public RPC > Alchemy public RPC
const getRpcUrl = () => {
  if (process.env.BASE_RPC_URL) {
    return process.env.BASE_RPC_URL;
  }
  // Use Base public RPC (more reliable than default)
  return "https://mainnet.base.org";
};

const publicClient = createPublicClient({
  chain: base,
  transport: http(getRpcUrl(), {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10000, // 10 second timeout
  }),
});

/**
 * API Route to get NFT by FID
 * 
 * This endpoint finds the tokenId for a given FID by searching MintForFID events
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json(
        { error: "fid is required" },
        { status: 400 }
      );
    }

    // Validate fid is a valid number
    const fidNum = fid.trim();
    if (!/^\d+$/.test(fidNum)) {
      return NextResponse.json(
        { error: "fid must be a valid number" },
        { status: 400 }
      );
    }

    // Check if FID has been minted with retry logic
    let mintedFid: boolean;
    try {
      console.log(`[nft-by-fid] Checking mintedFid for FID ${fidNum}`);
      mintedFid = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function mintedFid(uint256) view returns (bool)"),
        ],
        functionName: "mintedFid",
        args: [BigInt(fidNum)],
      });
      console.log(`[nft-by-fid] mintedFid result for FID ${fidNum}: ${mintedFid}`);
    } catch (error) {
      console.error(`[nft-by-fid] Error checking mintedFid for FID ${fidNum}:`, error);
      // If RPC fails, return 503 to indicate service unavailable
      return NextResponse.json(
        { 
          error: "RPC service temporarily unavailable", 
          details: error instanceof Error ? error.message : String(error),
          fid: fidNum,
          retry: true
        },
        { status: 503 }
      );
    }

    if (!mintedFid) {
      return NextResponse.json(
        { error: "FID has not been minted", minted: false },
        { status: 404 }
      );
    }

    // Method 1: Try to find tokenId by iterating through all NFTs (more reliable for old mints)
    // Use nextId() to get total supply, then loop from 0 to nextId-1
    // Check each tokenId's tokenURI to find the one with matching FID
    try {
      const nextId = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function nextId() view returns (uint256)"),
        ],
        functionName: "nextId",
      });
      
      const totalSupply = Number(nextId);
      console.log(`Total supply (nextId): ${totalSupply}, searching for FID ${fidNum}`);
      
      // Loop through all tokenIds to find the one with matching FID
      // Start from 0 (first NFT) to nextId-1
      for (let i = 0; i < totalSupply; i++) {
        try {
          // Check if NFT exists by calling ownerOf
          const owner = await publicClient.readContract({
            address: NFT_CONTRACT_ADDRESS,
            abi: [
              parseAbiItem("function ownerOf(uint256 tokenId) view returns (address)"),
            ],
            functionName: "ownerOf",
            args: [BigInt(i)],
          });
          
          // If owner is zero address, NFT doesn't exist (skip)
          if (!owner || owner === "0x0000000000000000000000000000000000000000") {
            continue;
          }
          
          // Get tokenURI to extract FID from metadata
          const tokenURI = await publicClient.readContract({
            address: NFT_CONTRACT_ADDRESS,
            abi: [
              parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
            ],
            functionName: "tokenURI",
            args: [BigInt(i)],
          });
          
          // Parse metadata to extract FID
          if (tokenURI.startsWith("data:application/json;base64,")) {
            const base64Data = tokenURI.replace("data:application/json;base64,", "");
            const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
            const metadata = JSON.parse(jsonStr);
            const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
              attr.trait_type === "FID"
            );
            
            if (fidAttr && fidAttr.value && String(fidAttr.value) === fidNum) {
              // Found matching FID! Return tokenId
              console.log(`✅ Found tokenId ${i} for FID ${fidNum} using direct contract lookup`);
              return NextResponse.json({
                tokenId: String(i),
                fid: fidNum,
                method: "contract_lookup",
              });
            }
          }
        } catch {
          // Skip this tokenId if it doesn't exist or has errors
          continue;
        }
      }
      
      console.log(`No matching FID found in ${totalSupply} NFTs, falling back to event search`);
    } catch (error) {
      console.warn("Error in contract lookup method, falling back to event search:", error);
    }

    // Method 2: Fallback - Search for Mint event to find tokenId
    // Try multiple search ranges to find the event (NFT may have been minted long ago)
    // Start with larger range, then reduce if timeout
    let logs: Log[] = [];
    const searchRanges = [50000, 30000, 20000, 10000, 5000, 2000, 1000]; // Increased ranges
    
    for (const range of searchRanges) {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > BigInt(range) ? currentBlock - BigInt(range) : BigInt(0);
        
        console.log(`Searching Mint events for FID ${fidNum} in blocks ${fromBlock} to latest (range: ${range})`);
        
        logs = await publicClient.getLogs({
          address: NFT_CONTRACT_ADDRESS,
          event: parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)"),
          fromBlock,
          toBlock: "latest",
        });
        
        console.log(`Found ${logs.length} Mint events in range ${range}`);
        
        // If we got logs, break and use them
        if (logs.length > 0) {
          break;
        }
      } catch (error) {
        console.error(`Error fetching logs with range ${range}:`, error);
        // Continue to next smaller range
        continue;
      }
    }

    // Filter logs by FID
    const filteredLogs = logs.filter((log) => {
      const parsed = parseEventLogs({
        abi: [
          parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)"),
        ],
        eventName: "Mint",
        logs: [log],
      });
      if (parsed.length > 0) {
        const event = parsed[0] as { args?: { fid?: bigint } };
        return event.args?.fid?.toString() === fidNum;
      }
      return false;
    });

    if (filteredLogs.length === 0) {
      // No Mint event found for this FID in search range
      // Smart contract uses tokenId = nextId++ (not fid = tokenId)
      // Cannot determine tokenId without event
      console.error(`No Mint event found for FID ${fidNum} in search range. Total logs searched: ${logs.length}`);
      return NextResponse.json(
        { 
          error: "Mint event not found for this FID. The NFT may have been minted outside the search range. Please try again later or contact support.", 
          minted: true,
          details: `Searched ${logs.length} total Mint events, but none matched FID ${fidNum}`
        },
        { status: 404 }
      );
    }

    // Get the most recent mint event
    const latestLog = filteredLogs[filteredLogs.length - 1];
    const parsedLogs = parseEventLogs({
      abi: [
        parseAbiItem("event Mint(address indexed to, uint256 indexed tokenId, uint256 fid)"),
      ],
      eventName: "Mint",
      logs: [latestLog],
    });

    if (parsedLogs.length === 0) {
      console.error("Failed to parse mint event. Latest log:", latestLog);
      return NextResponse.json(
        { 
          error: "Failed to parse mint event. The contract data may be corrupted.", 
          minted: true,
          details: "Could not parse Mint event from blockchain logs"
        },
        { status: 500 }
      );
    }

    const event = parsedLogs[0] as { args?: { tokenId?: bigint; to?: string; fid?: bigint } };
    const tokenId = event.args?.tokenId?.toString();
    const eventFid = event.args?.fid?.toString();

    // Verify FID matches
    if (eventFid !== fidNum) {
      console.error(`FID mismatch: expected ${fidNum}, got ${eventFid} from event`);
    }

    // ✅ Accept tokenId = "0" (first NFT minted)
    // Validate tokenId is a valid number (including "0")
    if (!tokenId || tokenId === "undefined" || tokenId === "null" || !/^\d+$/.test(tokenId)) {
      console.error("Invalid tokenId from event:", tokenId, "Event args:", event.args, "FID:", eventFid);
      return NextResponse.json(
        { 
          error: "TokenId not found in mint event. This may indicate a contract issue.", 
          minted: true,
          details: `Event args: ${JSON.stringify(event.args)}, FID: ${eventFid}`
        },
        { status: 500 }
      );
    }

    console.log(`✅ Found tokenId ${tokenId} for FID ${fidNum} from Mint event`);

    // Get tokenURI with error handling
    let tokenURI: string;
    let owner: string;
    try {
      tokenURI = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
        ],
        functionName: "tokenURI",
        args: [BigInt(tokenId)],
      });

      // Get owner
      owner = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function ownerOf(uint256 tokenId) view returns (address)"),
        ],
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });
    } catch (error) {
      console.error("Error reading contract data:", error);
      return NextResponse.json(
        { 
          error: "RPC service temporarily unavailable", 
          details: error instanceof Error ? error.message : String(error),
          retry: true
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      fid: fidNum,
      tokenId,
      tokenURI,
      owner,
      minted: true,
    });
  } catch (error) {
    console.error("Error fetching NFT by FID:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch NFT by FID", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

