import { NextRequest, NextResponse } from "next/server";
import { generateHTMLCanvasBase64 } from "../../../lib/generate-html-canvas";

/**
 * API Route to generate HTML canvas base64 for smart contract
 * 
 * This endpoint generates HTML canvas with p5.js that matches the art from p5-art-generator
 * Returns base64 encoded HTML string that can be used in smart contract metadata
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tokenId = searchParams.get("tokenId") || searchParams.get("fid") || "0";

    // Validate tokenId is a valid number
    if (!/^\d+$/.test(tokenId.trim())) {
      return NextResponse.json(
        { error: "tokenId must be a valid number" },
        { status: 400 }
      );
    }

    // Generate HTML canvas base64
    const htmlBase64 = generateHTMLCanvasBase64({ tokenId: tokenId.trim() });

    return NextResponse.json({
      tokenId: tokenId.trim(),
      htmlBase64,
      htmlDataUri: `data:text/html;base64,${htmlBase64}`,
    });
  } catch (error) {
    console.error("Error generating HTML canvas:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate HTML canvas", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

