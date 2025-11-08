"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ArtGenerator from "../../components/ArtGenerator";
import { minikitConfig } from "../../../minikit.config";

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export default function NFTViewClient({ tokenId }: { tokenId: string }) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/nft-metadata?tokenId=${tokenId}`);
        
        if (!response.ok) {
          // If metadata not found, fallback to ArtGenerator
          console.warn("Metadata not found, using ArtGenerator fallback");
          setError("Metadata not found, showing generated art");
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error("Error fetching metadata:", err);
        setError("Failed to load metadata, showing generated art");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [tokenId]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">
          {metadata?.name || `NFT #${tokenId}`}
        </h1>
        <p className="text-gray-600 mb-8">
          {metadata?.description || `This NFT was minted on ${minikitConfig.miniapp.name}`}
        </p>

        <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
          <div className="flex justify-center mb-4">
            {isLoading ? (
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Loading NFT...</p>
              </div>
            ) : metadata?.image ? (
              <div className="w-full max-w-md">
                <img 
                  src={metadata.image} 
                  alt={metadata.name || `NFT #${tokenId}`}
                  className="w-full h-auto rounded-lg shadow-md"
                  onError={(e) => {
                    // Fallback to ArtGenerator if image fails to load
                    console.error("Image failed to load, using ArtGenerator fallback");
                    setError("Image failed to load, showing generated art");
                  }}
                />
              </div>
            ) : (
              <ArtGenerator tokenId={tokenId} />
            )}
          </div>
          <div className="text-left">
            <h2 className="text-xl font-semibold mb-2">Token ID: {tokenId}</h2>
            {metadata?.attributes && metadata.attributes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Attributes:</h3>
                <div className="flex flex-wrap gap-2">
                  {metadata.attributes.map((attr, idx) => (
                    <div 
                      key={idx}
                      className="bg-gray-100 px-3 py-1 rounded-full text-sm"
                    >
                      <span className="font-semibold">{attr.trait_type}:</span>{" "}
                      <span>{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {error && (
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-yellow-800">{error}</p>
              </div>
            )}
            <p className="text-gray-600 mb-4">
              Share this page to show off your NFT in Farcaster feeds!
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Tip: When you share this URL in a Farcaster cast, it will appear as a rich embed
                with a button to view the NFT directly in the app.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/mint"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Mint Another NFT
          </Link>
        </div>
      </div>
    </main>
  );
}

