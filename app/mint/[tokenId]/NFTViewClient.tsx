"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ArtGenerator from "../../components/ArtGenerator";
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { minikitConfig } from "../../../minikit.config";

interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export default function NFTViewClient({ tokenId }: { tokenId: string }) {
  const { composeCastAsync } = useComposeCast();
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [fid, setFid] = useState<string | undefined>(undefined);
  const [farcasterUser, setFarcasterUser] = useState<{
    username?: string;
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    followersCount?: number;
    followingCount?: number;
    castsCount?: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Reset states when tokenId changes
    setError(null);
    setMetadata(null);
    
    const fetchMetadata = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoading(true);
        
        // If smart contract uses tokenID = FID, try to fetch by FID first
        // Then try to fetch metadata using tokenId as tokenId
        let metadataResponse = await fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(tokenId)}`);
        
        // If not found, try using tokenId as FID (for contracts where tokenId = FID)
        if (!metadataResponse.ok && metadataResponse.status === 404) {
          // Try fetching by FID
          const fidResponse = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(tokenId)}`);
          if (fidResponse.ok) {
            const fidData = await fidResponse.json();
            if (fidData.tokenId) {
              // Fetch metadata using the actual tokenId from FID lookup
              metadataResponse = await fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(fidData.tokenId)}`);
            }
          }
        }
        
        if (!isMounted) return;
        
        if (!metadataResponse.ok) {
          // If metadata not found, check if it's a 404 (NFT doesn't exist)
          if (metadataResponse.status === 404) {
            const errorData = await metadataResponse.json().catch(() => ({}));
            if (isMounted) {
              setError(errorData.error || "NFT not found - This token has not been minted yet");
              setIsLoading(false);
            }
          } else {
            // Other errors
            console.warn("Metadata not found, using ArtGenerator fallback");
            if (isMounted) {
              setError("Failed to load metadata");
              setIsLoading(false);
            }
          }
          return;
        }

        const data = await metadataResponse.json();
        if (isMounted) {
          setMetadata(data);
          
          // If smart contract uses tokenID = FID, use tokenId as FID directly
          // Otherwise, extract FID from metadata attributes
          let extractedFid: string | undefined = undefined;
          
          // Try to extract FID from metadata attributes first
          const fidAttr = data.attributes?.find((attr: { trait_type: string; value: string | number }) => 
            attr.trait_type === "FID"
          );
          if (fidAttr && fidAttr.value) {
            extractedFid = String(fidAttr.value);
          } else {
            // If FID not in metadata, assume tokenId = FID (for contracts where tokenId = FID)
            extractedFid = tokenId;
          }
          
          if (extractedFid) {
            setFid(extractedFid);
            
            // Fetch Farcaster user data
            fetch(`/api/farcaster-user?fid=${encodeURIComponent(extractedFid)}`)
              .then((userRes) => userRes.ok ? userRes.json() : null)
              .then((userData) => {
                if (isMounted && userData?.user) {
                  setFarcasterUser(userData.user);
                }
              })
              .catch((err) => {
                console.warn("Error fetching Farcaster user:", err);
                // Don't show error, just skip user data
              });
          }
        }
      } catch (err) {
        console.error("Error fetching metadata:", err);
        if (isMounted) {
          setError("Failed to load metadata, showing generated art");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMetadata();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [tokenId]);

  const handleShareFarcaster = async () => {
    try {
      setIsSharing(true);
      const shareUrl = `${process.env.NEXT_PUBLIC_ROOT_URL || window.location.origin}/mint/${tokenId}`;
      const text = `🎨 Check out my NFT #${tokenId} on ${minikitConfig.miniapp.name}! ${shareUrl}`;
      
      const result = await composeCastAsync({
        text: text,
        embeds: [shareUrl]
      });

      if (result?.cast) {
        console.log("Cast created successfully:", result.cast.hash);
      }
    } catch (error) {
      console.error("Error sharing cast:", error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${process.env.NEXT_PUBLIC_ROOT_URL || window.location.origin}/mint/${tokenId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Error copying link:", error);
    }
  };

  const handleShareTwitter = () => {
    const shareUrl = `${process.env.NEXT_PUBLIC_ROOT_URL || window.location.origin}/mint/${tokenId}`;
    const text = `🎨 Check out my NFT #${tokenId} on ${minikitConfig.miniapp.name}!`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

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
            ) : error && error.includes("not been minted") ? (
              <div className="w-full h-96 bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200">
                <div className="text-center p-8">
                  <p className="text-2xl mb-4">❌</p>
                  <p className="text-lg font-semibold text-red-800 mb-2">NFT Not Found</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md relative">
                {isLoading ? (
                  <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Loading art...</p>
                  </div>
                ) : (
                  <>
                    {/* Use FID if available (for contracts where tokenId = FID), otherwise use tokenId */}
                    <ArtGenerator tokenId={fid || tokenId} fid={fid || tokenId} width={600} height={600} />
                    {!fid && metadata && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        ⚠️ Warning: FID not found in metadata, using Token ID as seed. Art may not match minted version.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="text-left">
            <h2 className="text-xl font-semibold mb-2">Token ID: {tokenId}</h2>
            
            {/* Farcaster User Info */}
            {farcasterUser && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  {farcasterUser.avatarUrl && (
                    <Image 
                      src={farcasterUser.avatarUrl} 
                      alt={farcasterUser.displayName || farcasterUser.username || "User"}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full"
                      unoptimized
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900">
                      {farcasterUser.displayName || farcasterUser.username || `FID: ${fid}`}
                    </h3>
                    {farcasterUser.username && (
                      <p className="text-sm text-purple-600">@{farcasterUser.username}</p>
                    )}
                  </div>
                </div>
                {farcasterUser.bio && (
                  <p className="text-sm text-purple-800 mt-2">{farcasterUser.bio}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-purple-600">
                  {farcasterUser.followersCount !== undefined && (
                    <span>👥 {farcasterUser.followersCount} followers</span>
                  )}
                  {farcasterUser.castsCount !== undefined && (
                    <span>📝 {farcasterUser.castsCount} casts</span>
                  )}
                </div>
              </div>
            )}
            
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
            {error && !error.includes("not been minted") && (
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
          {/* Share Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleShareFarcaster}
              disabled={isSharing}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isSharing ? "Sharing..." : "📱 Share on Farcaster"}
            </button>
            
            <button
              onClick={handleShareTwitter}
              className="px-6 py-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold"
            >
              🐦 Share on Twitter/X
            </button>
            
            <button
              onClick={handleCopyLink}
              className={`px-6 py-3 rounded-lg transition-colors font-semibold ${
                copySuccess
                  ? "bg-green-600 text-white"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
            >
              {copySuccess ? "✓ Copied!" : "📋 Copy Link"}
            </button>
          </div>

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

