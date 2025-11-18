import { NextRequest, NextResponse } from "next/server";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

/**
 * API Route to verify Sign In with Farcaster message
 * 
 * Following Farcaster Auth Guide:
 * https://miniapps.farcaster.xyz/docs/guides/auth
 * 
 * This endpoint verifies the SIWF message and signature from the client
 * and returns user information including FID.
 * 
 * Based on examples from: https://github.com/farcasterxyz/miniapps
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature, nonce } = await request.json();

    // Validate required fields
    if (!message || typeof message !== 'string') {
      console.error("[verify-signin] Missing or invalid message");
      return NextResponse.json(
        { error: "Missing or invalid message" },
        { status: 400 }
      );
    }

    if (!signature || typeof signature !== 'string') {
      console.error("[verify-signin] Missing or invalid signature");
      return NextResponse.json(
        { error: "Missing or invalid signature" },
        { status: 400 }
      );
    }

    // Validate signature format (should start with 0x)
    if (!signature.startsWith('0x')) {
      console.error("[verify-signin] Invalid signature format (must start with 0x)");
      return NextResponse.json(
        { error: "Invalid signature format" },
        { status: 400 }
      );
    }

    // Validate message format (should be SIWE message)
    // Check for common Farcaster SIWE message patterns
    const isValidMessage = message.includes("farcaster.xyz") || 
                          message.includes("Sign in with Farcaster") ||
                          message.includes("wants you to sign in") ||
                          (message.includes("URI:") && message.includes("Version:") && message.includes("Chain ID:"));
    
    if (!isValidMessage) {
      console.warn("[verify-signin] Message may not be a valid Farcaster sign-in message");
      // Continue anyway - let the SDK verify it
    }

    // Get domain for verification
    const domain = getUrlHost(request);
    console.log("[verify-signin] Using origin host:", domain);
    console.log("[verify-signin] Verifying sign in message with domain:", domain, "nonce:", nonce ? "provided" : "missing");

    // Get RPC URL for viemConnector (same logic as nft-by-fid route)
    // Priority: BASE_RPC_URL env var > Base public RPC
    const getRpcUrl = () => {
      if (process.env.BASE_RPC_URL) {
        return process.env.BASE_RPC_URL;
      }
      // Use Base public RPC (more reliable than default)
      return "https://mainnet.base.org";
    };

    // Create Farcaster auth client using viemConnector with RPC URL
    // viemConnector handles getFid and isValidAuthAddress automatically
    // Providing rpcUrl prevents "No rpcUrl provided" warning
    const client = createAppClient({
      ethereum: viemConnector({
        rpcUrl: getRpcUrl(),
      }),
    });

    // Verify the sign in message
    // Note: verifySignInMessage now supports Auth Addresses (v0.7.0+)
    // Type assertion: signature is validated to start with 0x above
    const result = await client.verifySignInMessage({
      message,
      signature: signature as `0x${string}`,
      domain,
      nonce, // Optional: verify nonce to prevent replay attacks
    });

    if (result.isError) {
      console.error("[verify-signin] Signature verification failed:", {
        error: result.error,
        domain,
        hasMessage: !!message,
        hasSignature: !!signature,
        hasNonce: !!nonce
      });
      return NextResponse.json(
        { 
          error: "Invalid signature", 
          details: result.error?.message || "Signature verification failed",
          domain 
        },
        { status: 401 }
      );
    }

    // Extract user information from verified message
    // result has fid (from FarcasterResourceParams) and data.address (from SiweMessage)
    const fid = result.fid;
    const address = result.data.address;

    console.log("[verify-signin] Sign in successful:", {
      fid: fid.toString(),
      address,
      domain
    });

    return NextResponse.json({
      success: true,
      user: {
        fid: fid.toString(),
        address,
      },
    });
  } catch (error) {
    console.error("Error verifying sign in:", error);
    return NextResponse.json(
      { 
        error: "Failed to verify sign in", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Helper to determine the correct domain for verification
function getUrlHost(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      console.log("[verify-signin] Using origin host:", url.host);
      return url.host;
    } catch (error) {
      console.warn("[verify-signin] Invalid origin header:", origin, error);
    }
  }

  const host = request.headers.get("host");
  if (host) {
    console.log("[verify-signin] Using request host:", host);
    return host;
  }

  // Priority: NEXT_PUBLIC_ROOT_URL > NEXT_PUBLIC_URL > VERCEL_URL > default
  let urlValue: string;
  if (process.env.NEXT_PUBLIC_ROOT_URL) {
    urlValue = process.env.NEXT_PUBLIC_ROOT_URL;
  } else if (process.env.NEXT_PUBLIC_URL) {
    urlValue = process.env.NEXT_PUBLIC_URL;
  } else if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_URL) {
    urlValue = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.VERCEL_URL) {
    urlValue = `https://${process.env.VERCEL_URL}`;
  } else {
    urlValue = "https://farcasterabstact.wtf"; // Default to production domain
  }

  try {
    const url = new URL(urlValue);
    console.log("[verify-signin] Using fallback host:", url.host);
    return url.host;
  } catch (error) {
    console.error("[verify-signin] Error parsing URL:", urlValue, error);
    // Fallback to extracting host from string if URL parsing fails
    const hostMatch = urlValue.match(/https?:\/\/([^\/]+)/);
    if (hostMatch && hostMatch[1]) {
      return hostMatch[1];
    }
    return "farcasterabstact.wtf"; // Final fallback
  }
}

