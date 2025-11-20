import { NextRequest, NextResponse } from "next/server";

/**
 * Debug endpoint to check domain configuration for Sign In
 * 
 * GET /api/debug-signin
 * 
 * Returns domain information and environment variables
 */
export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    const referer = request.headers.get("referer");

    // Get domain using same logic as verify-signin
    const getUrlHost = () => {
      if (origin) {
        try {
          const url = new URL(origin);
          return url.host;
        } catch (error) {
          console.warn("[debug-signin] Invalid origin header:", origin, error);
        }
      }

      if (host) {
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
        urlValue = "https://farcasterabstact.wtf";
      }

      try {
        const url = new URL(urlValue);
        return url.host;
      } catch {
        const hostMatch = urlValue.match(/https?:\/\/([^\/]+)/);
        if (hostMatch && hostMatch[1]) {
          return hostMatch[1];
        }
        return "farcasterabstact.wtf";
      }
    };

    const domain = getUrlHost();

    return NextResponse.json({
      domain,
      headers: {
        origin,
        host,
        referer,
      },
      environment: {
        NEXT_PUBLIC_ROOT_URL: process.env.NEXT_PUBLIC_ROOT_URL || "NOT SET",
        NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || "NOT SET",
        VERCEL_URL: process.env.VERCEL_URL || "NOT SET",
        VERCEL_ENV: process.env.VERCEL_ENV || "NOT SET",
      },
      recommendation: {
        shouldSet: !process.env.NEXT_PUBLIC_ROOT_URL,
        recommendedValue: "https://farcasterabstact.wtf",
        message: process.env.NEXT_PUBLIC_ROOT_URL 
          ? "✅ NEXT_PUBLIC_ROOT_URL is set correctly"
          : "⚠️ Please set NEXT_PUBLIC_ROOT_URL=https://farcasterabstact.wtf in Vercel"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to debug sign in configuration",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

