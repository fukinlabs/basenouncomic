import { NextResponse } from "next/server";
import { minikitConfig } from "@/minikit.config";

export async function GET() {
  // Generate manifest from config (excluding accountAssociation)
  const manifest = {
    ...minikitConfig.miniapp,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}


