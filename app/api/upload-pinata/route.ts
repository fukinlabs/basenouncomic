import { NextRequest, NextResponse } from "next/server";

/**
 * API Route to upload image to Pinata IPFS
 * 
 * This endpoint receives a base64 image, converts it to a file,
 * and uploads it to Pinata IPFS.
 * 
 * Environment variables required (choose one method):
 * - PINATA_JWT: Your Pinata JWT token (recommended)
 * OR
 * - PINATA_API_KEY: Your Pinata API Key
 * - PINATA_SECRET_API_KEY: Your Pinata Secret API Key
 */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64, tokenId, fid } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    // Check if Pinata credentials are configured
    // Support both JWT token and API Key + Secret
    const pinataJWT = process.env.PINATA_JWT;
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

    const hasJWT = !!pinataJWT;
    const hasApiKey = !!pinataApiKey && !!pinataSecretKey;

    if (!hasJWT && !hasApiKey) {
      return NextResponse.json(
        { 
          error: "Pinata API credentials not configured. Please set either PINATA_JWT or both PINATA_API_KEY and PINATA_SECRET_API_KEY environment variables.",
          fallback: "You can use the base64 directly, but it's not recommended for production."
        },
        { status: 500 }
      );
    }

    // Convert base64 to Buffer
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Create FormData for Pinata
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: "image/png" });
    const filename = `nft-${tokenId || fid || Date.now()}.png`;
    
    formData.append("file", blob, filename);

    // Add metadata
    const metadata = JSON.stringify({
      name: `NFT #${tokenId || fid || "unknown"}`,
      description: `Generative art NFT for Farcaster FID ${fid}`,
      attributes: [
        { trait_type: "FID", value: fid || "unknown" },
        { trait_type: "Token ID", value: tokenId || "unknown" },
      ],
    });
    formData.append("pinataMetadata", metadata);

    // Upload to Pinata
    // Use JWT token if available, otherwise use API Key + Secret
    const pinataHeaders: HeadersInit = hasJWT
      ? {
          Authorization: `Bearer ${pinataJWT}`,
        }
      : {
          pinata_api_key: pinataApiKey!,
          pinata_secret_api_key: pinataSecretKey!,
        };

    const pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: pinataHeaders,
      body: formData,
    });

    if (!pinataResponse.ok) {
      const error = await pinataResponse.text();
      console.error("Pinata upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload to Pinata", details: error },
        { status: pinataResponse.status }
      );
    }

    const pinataData = await pinataResponse.json();
    const ipfsHash = pinataData.IpfsHash;
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    // Create metadata JSON for NFT
    const nftMetadata = {
      name: `NFT #${tokenId || fid}`,
      description: `Generative art NFT for Farcaster FID ${fid}`,
      image: ipfsUrl,
      external_url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/mint/${tokenId || fid}`,
      attributes: [
        { trait_type: "FID", value: fid || "unknown" },
        { trait_type: "Token ID", value: tokenId || "unknown" },
      ],
    };

    // Upload metadata JSON to Pinata
    const metadataFormData = new FormData();
    const metadataBlob = new Blob([JSON.stringify(nftMetadata, null, 2)], {
      type: "application/json",
    });
    metadataFormData.append("file", metadataBlob, `metadata-${tokenId || fid || Date.now()}.json`);
    metadataFormData.append("pinataMetadata", JSON.stringify({
      name: `NFT Metadata #${tokenId || fid}`,
    }));

    const metadataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: pinataHeaders,
      body: metadataFormData,
    });

    let metadataIpfsHash = null;
    let metadataIpfsUrl = null;

    if (metadataResponse.ok) {
      const metadataData = await metadataResponse.json();
      metadataIpfsHash = metadataData.IpfsHash;
      metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`;
    }

    return NextResponse.json({
      success: true,
      image: {
        ipfsHash,
        ipfsUrl,
      },
      metadata: metadataIpfsHash
        ? {
            ipfsHash: metadataIpfsHash,
            ipfsUrl: metadataIpfsUrl,
          }
        : null,
    });
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    return NextResponse.json(
      { error: "Failed to upload to Pinata", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

