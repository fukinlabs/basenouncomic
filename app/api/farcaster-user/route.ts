import { NextRequest, NextResponse } from "next/server";

/**
 * API Route to get Farcaster user information from FID
 * 
 * This endpoint fetches user data from Farcaster API
 * Documentation: https://api.farcaster.xyz/v1/user?fid=<FID>
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

    // Fetch user data from Farcaster API
    const farcasterApiUrl = `https://api.farcaster.xyz/v1/user?fid=${fidNum}`;
    
    try {
      const response = await fetch(farcasterApiUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // If user not found, return error
        if (response.status === 404) {
          return NextResponse.json(
            { error: "User not found", fid: fidNum },
            { status: 404 }
          );
        }
        
        return NextResponse.json(
          { error: `Farcaster API error: ${response.statusText}`, fid: fidNum },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      // Return user data
      return NextResponse.json({
        fid: fidNum,
        user: data.user || null,
        success: true,
      });
    } catch (fetchError) {
      console.error("Error fetching from Farcaster API:", fetchError);
      return NextResponse.json(
        { 
          error: "Failed to fetch user data from Farcaster API", 
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
          fid: fidNum
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in farcaster-user API:", error);
    return NextResponse.json(
      { 
        error: "Failed to process request", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

