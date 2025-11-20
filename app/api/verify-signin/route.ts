import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@farcaster/quick-auth";

/**
 * API Route to verify Farcaster Quick Auth JWT
 * 
 * Uses @farcaster/quick-auth to verify the token provided by sdk.quickAuth.getToken()
 * Doc: https://miniapps.farcaster.xyz/docs/sdk/quick-auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both new Quick Auth (token) and old SIWF (message/signature) for backward compatibility if needed
    // But primarily we want to use token now
    const { token, message, signature, nonce } = body;

    // If using Quick Auth (JWT) - Recommended
    if (token) {
      try {
        // Initialize Quick Auth client
        const client = createClient();
        
        // Verify the JWT
        const payload = await client.verifyJwt({ 
          token,
          domain: "farcasterabstact.wtf" // Domain is required by type definition
        });

        console.log("[verify-signin] Quick Auth JWT verified successfully:", payload);

        // Fetch user details to get address if needed (Quick Auth only gives FID in payload)
        // payload.sub is the FID
        const fid = payload.sub;
        let address = null;
        
        // Use any for payload to access optional properties that might be missing in type definition
        // or properties that we expect but TypeScript doesn't know about
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payloadAny = payload as any;
        const username = payloadAny.username || payloadAny.name || "";
        const displayName = payloadAny.display_name || payloadAny.name || "";
        const pfpUrl = payloadAny.pfp_url || payloadAny.picture || "";

        // Try to get primary address for this FID using Farcaster API
        try {
          const userResponse = await fetch(`https://client.warpcast.com/v2/user?fid=${fid}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Try to find a verified address or custody address
            address = userData.result?.user?.custodyAddress;
          }
        } catch (addrError) {
          console.warn("[verify-signin] Failed to fetch user address:", addrError);
        }

        return NextResponse.json({
          success: true,
          user: {
            fid: fid.toString(),
            address: address, // Might be null if fetch failed, but we have authenticated FID
            username: username,
            displayName: displayName,
            pfpUrl: pfpUrl,
          },
          method: "quick_auth"
        });

      } catch (error) {
        console.error("[verify-signin] Invalid Quick Auth token:", error);
        return NextResponse.json(
          { error: "Invalid token", details: error instanceof Error ? error.message : String(error) },
          { status: 401 }
        );
      }
    }

    // Fallback: Old Sign In with Farcaster (SIWF)
    // ... existing logic for message/signature verification ...
    if (message && signature) {
      return verifySIWF(message, signature, nonce, request);
    }

    return NextResponse.json(
      { error: "Missing token or signature" },
      { status: 400 }
    );

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

// Fallback function for old SIWF verification
async function verifySIWF(message: string, signature: string, nonce: string | undefined, request: NextRequest) {
  try {
    const { createAppClient, viemConnector } = await import("@farcaster/auth-client");
    
    const getRpcUrl = () => {
      if (process.env.BASE_RPC_URL) return process.env.BASE_RPC_URL;
      return "https://mainnet.base.org";
    };

    const client = createAppClient({
      ethereum: viemConnector({
        rpcUrl: getRpcUrl(),
      }),
    });

    // Extract domain from message if possible
    let domain: string = "farcasterabstact.wtf"; // Default fallback
    try {
        const uriMatch = message.match(/URI:\s*(https?:\/\/[^\s\n]+)/);
        if (uriMatch && uriMatch[1]) {
            domain = new URL(uriMatch[1]).host;
        } else {
            // Helper to determine domain from request
            const origin = request.headers.get("origin");
            if (origin) {
              domain = new URL(origin).host;
            } else {
              const host = request.headers.get("host");
              if (host) domain = host;
            }
        }
    } catch (e) {
        console.warn("Error extracting domain:", e);
        // Keep default domain if extraction fails
    }

    // Ensure domain is always a string (TypeScript type guard)
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: "Domain required for SIWF verification" }, { status: 400 });
    }

    // TypeScript type assertion: domain is guaranteed to be string after check above
    const verifiedDomain: string = domain;

    // nonce is required by verifySignInMessage - use provided nonce or generate a default
    const nonceToUse: string = nonce && typeof nonce === 'string' 
      ? nonce 
      : Math.random().toString(36).substring(2, 15);

    const result = await client.verifySignInMessage({
      message,
      signature: signature as `0x${string}`,
      domain: verifiedDomain,
      nonce: nonceToUse,
    });

    if (result.isError) {
      return NextResponse.json({ error: "Invalid signature", details: result.error?.message }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        fid: result.fid.toString(),
        address: result.data.address,
      },
      method: "siwf"
    });
  } catch (e) {
    // Using e to log error details if needed, or just ignore
    console.error("SIWF error:", e);
    return NextResponse.json({ error: "SIWF verification failed" }, { status: 500 });
  }
}
