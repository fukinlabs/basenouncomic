import { NextRequest, NextResponse } from "next/server";
import { verifySignInMessage } from "@farcaster/auth-client";

/**
 * API Route to verify Sign In with Farcaster message
 * 
 * Following Farcaster Auth Guide:
 * https://miniapps.farcaster.xyz/docs/guides/auth
 * 
 * This endpoint verifies the SIWF message and signature from the client
 * and returns user information including FID.
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

    // Verify the sign in message
    // Note: verifySignInMessage now supports Auth Addresses (v0.7.0+)
    const result = await verifySignInMessage({
      message,
      signature,
      domain: getUrlHost(request),
      nonce, // Optional: verify nonce to prevent replay attacks
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid signature", details: result.error },
        { status: 401 }
      );
    }

    // Extract user information from verified message
    const fid = result.fid;
    const address = result.address;

    return NextResponse.json({
      success: true,
      user: {
        fid,
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

