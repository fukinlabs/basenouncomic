import { NextRequest, NextResponse } from "next/server";
import { keccak256, encodePacked } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(request: NextRequest) {
  try {
    const { userAddress, to, fid, isSignedIn, isInMiniApp } = await request.json();

    // Validation: Must be authenticated
    if (!isSignedIn && !isInMiniApp) {
      return NextResponse.json(
        { error: "Unauthorized: Must sign in with Farcaster or use Mini App" },
        { status: 401 }
      );
    }

    // Validation: FID must be valid
    const fidNumber = parseInt(fid, 10);
    if (isNaN(fidNumber) || fidNumber <= 0 || fidNumber >= 1000000) {
      return NextResponse.json(
        { error: "Invalid FID: Must be between 1 and 999,999" },
        { status: 400 }
      );
    }

    // Validation: Address must be valid
    if (!userAddress || !to || typeof userAddress !== "string" || typeof to !== "string") {
      return NextResponse.json(
        { error: "Invalid address: userAddress and to are required" },
        { status: 400 }
      );
    }

    // Optional: Check origin/referer for additional security
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");
    
    // Allow requests from same origin or trusted domains
    const allowedDomains = [
      "farcasterabstact.wtf",
      "localhost:3000",
      "vercel.app",
    ];
    
    const isAllowedOrigin = origin && allowedDomains.some(domain => origin.includes(domain));
    const isAllowedReferer = referer && allowedDomains.some(domain => referer.includes(domain));
    const isAllowedHost = host && allowedDomains.some(domain => host.includes(domain));
    
    if (!isAllowedOrigin && !isAllowedReferer && !isAllowedHost) {
      console.warn("Request from untrusted origin:", { origin, referer, host });
      // Don't block, but log for monitoring
    }

    // Get private key from environment
    const privateKey = process.env.MINT_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "MINT_SIGNER_PRIVATE_KEY not configured. Please set it in Vercel environment variables." },
        { status: 500 }
      );
    }

    // Generate nonce (timestamp + random for uniqueness)
    const nonce = Date.now() + Math.floor(Math.random() * 10000);
    const chainId = 8453; // Base Mainnet chain ID

    // Generate message hash (must match contract's abi.encodePacked)
    const messageHash = keccak256(
      encodePacked(
        ["address", "address", "uint256", "uint256", "uint256"],
        [userAddress as `0x${string}`, to as `0x${string}`, BigInt(fidNumber), BigInt(nonce), BigInt(chainId)]
      )
    );

    // Generate Ethereum signed message hash
    const ethSignedMessageHash = keccak256(
      encodePacked(
        ["string", "bytes32"],
        ["\x19Ethereum Signed Message:\n32", messageHash]
      )
    );

    // Sign with private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const signature = await account.signMessage({ message: { raw: ethSignedMessageHash } });

    console.log("Generated mint signature:", {
      userAddress,
      to,
      fid: fidNumber,
      nonce,
      signer: account.address,
      signatureLength: signature.length,
    });

    return NextResponse.json({
      success: true,
      signature,
      nonce,
      messageHash,
      signer: account.address,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
    });
  } catch (error) {
    console.error("Error generating mint signature:", error);
    return NextResponse.json(
      { error: "Failed to generate mint signature", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

