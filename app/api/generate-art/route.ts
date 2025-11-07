import { NextRequest, NextResponse } from "next/server";

// API endpoint to generate art and return base64
// This will be called from client-side after rendering
export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();
    
    if (!imageData) {
      return NextResponse.json(
        { error: "imageData is required" },
        { status: 400 }
      );
    }

    // Return the base64 image data
    return NextResponse.json({ 
      base64: imageData,
      success: true 
    });
  } catch (error) {
    console.error("Error generating art:", error);
    return NextResponse.json(
      { error: "Failed to generate art" },
      { status: 500 }
    );
  }
}

// GET endpoint to generate art server-side using SVG
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenId = searchParams.get("tokenId") || "0";
  const format = searchParams.get("format") || "svg"; // svg or base64

  // For now, return SVG (can be converted to base64 on client)
  // In production, you might want to use a service that can render canvas server-side
  
  const width = 600;
  const height = 600;
  
  // Create a simple SVG representation
  // Note: This is a placeholder - the actual p5.js code should be rendered client-side
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#E3E3E3"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" fill="#000">
        Token ID: ${tokenId}
      </text>
      <text x="50%" y="60%" font-family="Arial" font-size="16" text-anchor="middle" fill="#666">
        Art will be generated client-side
      </text>
    </svg>
  `.trim();

  if (format === "base64") {
    const base64 = Buffer.from(svg).toString('base64');
    return NextResponse.json({ 
      base64: `data:image/svg+xml;base64,${base64}`,
      tokenId 
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", "image/svg+xml");
  headers.set("Cache-Control", "public, immutable, no-transform, max-age=300");

  return new NextResponse(svg, { headers });
}

