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

    if (!message || !signature) {
      return NextResponse.json(
        { error: "Missing message or signature" },
        { status: 400 }
      );
    }

    // Create Farcaster auth client using viemConnector
    // viemConnector handles getFid and isValidAuthAddress automatically
    const client = createAppClient({
      ethereum: viemConnector(),
    });

    // Verify the sign in message
    // Note: verifySignInMessage now supports Auth Addresses (v0.7.0+)
    const result = await client.verifySignInMessage({
      message,
      signature,
      domain: getUrlHost(request),
      nonce, // Optional: verify nonce to prevent replay attacks
    });

    if (result.isError) {
      return NextResponse.json(
        { error: "Invalid signature", details: result.error?.message },
        { status: 401 }
      );
    }

    // Extract user information from verified message
    // result has fid (from FarcasterResourceParams) and data.address (from SiweMessage)
    const fid = result.fid;
    const address = result.data.address;

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
      return url.host;
    } catch (error) {
      console.warn("Invalid origin header:", origin, error);
    }
  }

  const host = request.headers.get("host");
  if (host) return host;

  let urlValue: string;
  if (process.env.VERCEL_ENV === "production") {
    urlValue = process.env.NEXT_PUBLIC_URL!;
  } else if (process.env.VERCEL_URL) {
    urlValue = `https://${process.env.VERCEL_URL}`;
  } else {
    urlValue = "http://localhost:3000";
  }

  const url = new URL(urlValue);
  return url.host;
}

