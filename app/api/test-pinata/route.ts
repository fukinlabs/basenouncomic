import { NextResponse } from "next/server";

/**
 * API Route to test if Pinata is configured correctly
 * 
 * GET /api/test-pinata
 * 
 * Returns:
 * - status: "configured" | "not_configured"
 * - method: "JWT" | "API_KEY" | null
 * - message: Status message
 */
export async function GET() {
  try {
    // Check if Pinata credentials are configured
    const pinataJWT = process.env.PINATA_JWT;
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

    const hasJWT = !!pinataJWT;
    const hasApiKey = !!pinataApiKey && !!pinataSecretKey;

    if (hasJWT) {
      // Test JWT token by making a simple API call to Pinata
      try {
        const testResponse = await fetch("https://api.pinata.cloud/data/testAuthentication", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${pinataJWT}`,
          },
        });

        if (testResponse.ok) {
          return NextResponse.json({
            status: "configured",
            method: "JWT",
            message: "Pinata JWT token is configured and working correctly",
            verified: true,
          });
        } else {
          const errorText = await testResponse.text();
          return NextResponse.json({
            status: "configured",
            method: "JWT",
            message: "Pinata JWT token is configured but authentication failed",
            verified: false,
            error: errorText,
          });
        }
      } catch (error) {
        return NextResponse.json({
          status: "configured",
          method: "JWT",
          message: "Pinata JWT token is configured but test failed",
          verified: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (hasApiKey) {
      // Test API Key by making a simple API call to Pinata
      try {
        const testResponse = await fetch("https://api.pinata.cloud/data/testAuthentication", {
          method: "GET",
          headers: {
            pinata_api_key: pinataApiKey!,
            pinata_secret_api_key: pinataSecretKey!,
          },
        });

        if (testResponse.ok) {
          return NextResponse.json({
            status: "configured",
            method: "API_KEY",
            message: "Pinata API Key is configured and working correctly",
            verified: true,
          });
        } else {
          const errorText = await testResponse.text();
          return NextResponse.json({
            status: "configured",
            method: "API_KEY",
            message: "Pinata API Key is configured but authentication failed",
            verified: false,
            error: errorText,
          });
        }
      } catch (error) {
        return NextResponse.json({
          status: "configured",
          method: "API_KEY",
          message: "Pinata API Key is configured but test failed",
          verified: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      return NextResponse.json({
        status: "not_configured",
        method: null,
        message: "Pinata credentials are not configured. Please set either PINATA_JWT or both PINATA_API_KEY and PINATA_SECRET_API_KEY environment variables.",
        verified: false,
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Error testing Pinata configuration",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

