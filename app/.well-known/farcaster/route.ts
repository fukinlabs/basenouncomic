import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Read manifest from public/.well-known/farcaster.json
    const manifestPath = path.join(process.cwd(), "public", ".well-known", "farcaster.json");
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error reading manifest:", error);
    return NextResponse.json(
      { error: "Manifest not found" },
      { status: 404 }
    );
  }
}


