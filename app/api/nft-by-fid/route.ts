import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, parseEventLogs, type Log } from "viem";
import { base } from "viem/chains";

const NFT_CONTRACT_ADDRESS = "0x7C68Be9f8ff5E30Ac3571631e6c52cB7369274fe" as const;

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
      mintedFid = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [
          parseAbiItem("function mintedFid(uint256) view returns (bool)"),
        ],
        functionName: "mintedFid",
        args: [BigInt(fidNum)],
      });
    } catch (error) {
      console.error("Error checking mintedFid:", error);
      // If RPC fails, return 503 to indicate service unavailable
      return NextResponse.json(
        { 
          error: "RPC service temporarily unavailable", 
          details: error instanceof Error ? error.message : String(error),
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

    // Search for MintForFID event to find tokenId
    // Use smaller search range to avoid RPC timeout (503 errors)
    // Start with last 5000 blocks, then expand if needed
    let logs: Log[] = [];
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > BigInt(5000) ? currentBlock - BigInt(5000) : BigInt(0);

      logs = await publicClient.getLogs({
        address: NFT_CONTRACT_ADDRESS,
        event: parseAbiItem("event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid)"),
        fromBlock,
        toBlock: "latest",
      });
    } catch (error) {
      console.error("Error fetching logs, trying smaller range:", error);
      // Try with even smaller range if first attempt fails
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > BigInt(1000) ? currentBlock - BigInt(1000) : BigInt(0);
        
        logs = await publicClient.getLogs({
          address: NFT_CONTRACT_ADDRESS,
          event: parseAbiItem("event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid)"),
          fromBlock,
          toBlock: "latest",
        });
      } catch (retryError) {
        console.error("Error fetching logs with smaller range:", retryError);
        // Continue with empty logs array - will use fallback method
      }
    }

    // Filter logs by FID
    const filteredLogs = logs.filter((log) => {
      const parsed = parseEventLogs({
        abi: [
          parseAbiItem("event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid)"),
        ],
        eventName: "MintForFID",
        logs: [log],
      });
      if (parsed.length > 0) {
        const event = parsed[0] as { args?: { fid?: bigint } };
        return event.args?.fid?.toString() === fidNum;
      }
      return false;
    });

    if (filteredLogs.length === 0) {
      // Fallback: use FID as tokenId (if contract uses FID as tokenId)
      const tokenId = fidNum;
      
      // Try to get tokenURI to verify
      try {
        const tokenURI = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS,
          abi: [
            parseAbiItem("function tokenURI(uint256 tokenId) view returns (string)"),
          ],
          functionName: "tokenURI",
          args: [BigInt(tokenId)],
        });

        if (tokenURI) {
          return NextResponse.json({
            fid: fidNum,
            tokenId,
            tokenURI,
            minted: true,
          });
        }
      } catch {
        // Token doesn't exist
      }

      return NextResponse.json(
        { error: "NFT not found for this FID", minted: true },
        { status: 404 }
      );
    }

    // Get the most recent mint event
    const latestLog = filteredLogs[filteredLogs.length - 1];
    const parsedLogs = parseEventLogs({
      abi: [
        parseAbiItem("event MintForFID(address indexed to, uint256 indexed tokenId, uint256 fid)"),
      ],
      eventName: "MintForFID",
      logs: [latestLog],
    });

    if (parsedLogs.length === 0) {
      return NextResponse.json(
        { error: "Failed to parse mint event", minted: true },
        { status: 500 }
      );
    }

    const event = parsedLogs[0] as { args?: { tokenId?: bigint; to?: string; fid?: bigint } };
    const tokenId = event.args?.tokenId?.toString();

    if (!tokenId || tokenId === "0" || tokenId === "undefined" || tokenId === "null") {
      console.error("Invalid tokenId from event:", tokenId, "Event args:", event.args);
      return NextResponse.json(
        { error: "TokenId not found in event or invalid", minted: true },
        { status: 500 }
      );
    }

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

