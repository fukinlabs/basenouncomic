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
    // Remove data URL prefix if present (e.g., "data:image/png;base64," or "data:image/jpeg;base64,")
    // Support various image formats: png, jpeg, jpg, gif, webp
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, "");
    
    // Validate base64 string
    if (!base64Data || base64Data.length === 0) {
      return NextResponse.json(
        { error: "Invalid base64 image data" },
        { status: 400 }
      );
    }
    
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(base64Data, "base64");
      if (imageBuffer.length === 0) {
        throw new Error("Empty buffer");
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to decode base64 image data" },
        { status: 400 }
      );
    }

    // Create FormData for Pinata
    const formData = new FormData();
    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(imageBuffer);
    
    // Detect image format from base64 prefix for proper MIME type
    let imageType = "image/png";
    let fileExtension = "png";
    if (imageBase64.startsWith("data:image/jpeg") || imageBase64.startsWith("data:image/jpg")) {
      imageType = "image/jpeg";
      fileExtension = "jpg";
    } else if (imageBase64.startsWith("data:image/webp")) {
      imageType = "image/webp";
      fileExtension = "webp";
    } else if (imageBase64.startsWith("data:image/gif")) {
      imageType = "image/gif";
      fileExtension = "gif";
    }
    
    const blob = new Blob([uint8Array], { type: imageType });
    const filename = `nft-${tokenId || fid || Date.now()}.${fileExtension}`;
    
    formData.append("file", blob, filename);

    // Add metadata
    const metadata = JSON.stringify({
      name: `Base Abstract #${tokenId || fid || "unknown"}`,
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
          // Assign uploads to specific Pinata Group
          "x-pinata-group-id": "90b37ada-51bc-4119-b7d7-afac43f345ae",
        }
      : {
          pinata_api_key: pinataApiKey!,
          pinata_secret_api_key: pinataSecretKey!,
          // Assign uploads to specific Pinata Group
          "x-pinata-group-id": "90b37ada-51bc-4119-b7d7-afac43f345ae",
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
    
    // Validate response structure
    if (!pinataData || typeof pinataData !== 'object' || !pinataData.IpfsHash) {
      console.error("Invalid Pinata response:", pinataData);
      return NextResponse.json(
        { error: "Invalid response from Pinata: missing IpfsHash" },
        { status: 500 }
      );
    }
    
    const ipfsHash = pinataData.IpfsHash;
    if (typeof ipfsHash !== 'string' || ipfsHash.length === 0) {
      return NextResponse.json(
        { error: "Invalid IPFS hash from Pinata" },
        { status: 500 }
      );
    }
    
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    const ipfsImageUrl = `ipfs://${ipfsHash}`; // Use IPFS protocol for metadata (NFTScan compatible)

    // Create metadata JSON for NFT (ERC-721 standard)
    // Use IPFS protocol URL for image field to ensure NFTScan and other explorers can access it
    // NFTScan requires proper ERC-721 metadata format with IPFS protocol URLs
    const nftMetadata = {
      name: `Base Abstract #${tokenId || fid}`,
      description: `Generative art NFT for Farcaster FID ${fid}`,
      image: ipfsImageUrl, // Use ipfs:// protocol for NFTScan compatibility
      // Priority: NEXT_PUBLIC_ROOT_URL > NEXT_PUBLIC_URL > VERCEL_URL > localhost
      // Set NEXT_PUBLIC_ROOT_URL in Vercel Dashboard → Settings → Environment Variables
      external_url: `${process.env.NEXT_PUBLIC_ROOT_URL || process.env.NEXT_PUBLIC_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")}/mint/${tokenId || fid}`,
      attributes: [
        { trait_type: "FID", value: String(fid || "unknown") },
        { trait_type: "Token ID", value: String(tokenId || "unknown") },
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
      try {
        const metadataData = await metadataResponse.json();
        if (metadataData && metadataData.IpfsHash && typeof metadataData.IpfsHash === 'string') {
          metadataIpfsHash = metadataData.IpfsHash;
          metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`;
        } else {
          console.warn("Metadata upload succeeded but response missing IpfsHash:", metadataData);
        }
      } catch (error) {
        console.error("Failed to parse metadata upload response:", error);
        // Continue without metadata hash - image upload was successful
      }
    } else {
      const errorText = await metadataResponse.text().catch(() => "Unknown error");
      console.error("Metadata upload failed:", metadataResponse.status, errorText);
      // Continue without metadata hash - image upload was successful
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

