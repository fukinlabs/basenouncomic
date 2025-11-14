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
        
        // Smart contract uses tokenId = nextId++ (not fid = tokenId)
        // First, try to fetch metadata using tokenId directly
        let metadataResponse = await fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(tokenId)}`);
        
        // If not found, try using tokenId as FID to find the actual tokenId
        // (in case user entered FID instead of tokenId in URL)
        if (!metadataResponse.ok && metadataResponse.status === 404) {
          // Try fetching by FID to get the actual tokenId
          const fidResponse = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(tokenId)}`);
          if (fidResponse.ok) {
            const fidData = await fidResponse.json();
            if (fidData.tokenId && fidData.tokenId !== tokenId) {
              // Found different tokenId, fetch metadata using the actual tokenId
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
              // If contract uses tokenId = FID, we can still generate art
              // Set tokenId as FID and allow art generation
              setFid(tokenId);
              
              // Try to fetch Farcaster user data using tokenId as FID
              fetch(`/api/farcaster-user?fid=${encodeURIComponent(tokenId)}`)
                .then((userRes) => userRes.ok ? userRes.json() : null)
                .then((userData) => {
                  if (isMounted && userData?.user) {
                    setFarcasterUser(userData.user);
                  }
                })
                .catch((err) => {
                  console.warn("Error fetching Farcaster user:", err);
                });
              
              setError(errorData.error || "NFT not found - This token has not been minted yet");
              setIsLoading(false);
            }
          } else {
            // Other errors
            console.warn("Metadata not found, using ArtGenerator fallback");
            if (isMounted) {
              // Still allow art generation with tokenId as FID
              setFid(tokenId);
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900">
          {metadata?.name || `NFT #${tokenId}`}
        </h1>
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
          {metadata?.description || `This NFT was minted on ${minikitConfig.miniapp.name}`}
        </p>

        <div className="bg-white p-4 sm:p-8 rounded-xl shadow-xl mb-6 sm:mb-8 border border-gray-200">
          <div className="flex justify-center mb-6">
            {isLoading ? (
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Loading NFT...</p>
              </div>
            ) : error && error.includes("not been minted") ? (
              // Show 404 error page with image when NFT not minted
              <div className="w-full max-w-2xl mx-auto">
                <div className="text-center">
                  <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">ERROR 404</h2>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">404</p>
                  
                  <div className="mb-6">
                    <Image
                      src="/error404.jpg"
                      alt="404 Error - NFT Not Found"
                      width={600}
                      height={400}
                      className="w-full h-auto rounded-lg shadow-lg mx-auto"
                      unoptimized
                    />
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-lg text-gray-700 mb-2">
                      This NFT has not been minted yet.
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Token ID: <span className="font-mono font-semibold">{tokenId}</span>
                    </p>
                  </div>
                  
                  <Link
                    href="/mint"
                    className="inline-block px-6 py-3 bg-action-primary text-white rounded-full hover:opacity-90 transition-opacity font-semibold shadow-lg hover:shadow-xl"
                  >
                    Go to Mint Page →
                  </Link>
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
            {/* Token ID and FID Info */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Token ID</h3>
                  <p className="text-lg font-mono text-blue-700">{tokenId}</p>
                </div>
                {fid && (
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Farcaster FID</h3>
                    <p className="text-lg font-mono text-blue-700">{fid}</p>
                  </div>
                )}
              </div>
            </div>
            
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
                    <span>👥 {farcasterUser.followersCount.toLocaleString()} followers</span>
                  )}
                  {farcasterUser.castsCount !== undefined && (
                    <span>📝 {farcasterUser.castsCount.toLocaleString()} casts</span>
                  )}
                </div>
              </div>
            )}
            
            {metadata?.attributes && metadata.attributes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-3">Attributes</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {metadata.attributes.map((attr, idx) => (
                    <div 
                      key={idx}
                      className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2 rounded-lg border border-gray-200"
                    >
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        {attr.trait_type}
                      </div>
                      <div className="text-base font-semibold text-gray-900">
                        {attr.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {error && !error.includes("not been minted") && (
              <div className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-200">
                <p className="text-sm text-yellow-800">{error}</p>
              </div>
            )}
            
            {/* Description Section */}
            {metadata?.description && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-sm text-gray-600">{metadata.description}</p>
              </div>
            )}
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200 mb-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                💡 Share this NFT
              </p>
              <p className="text-xs text-blue-700">
                When you share this URL in a Farcaster cast, it will appear as a rich embed
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
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              {isSharing ? "Sharing..." : "📱 Share on Farcaster"}
            </button>
            
            <button
              onClick={handleShareTwitter}
              className="px-6 py-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              🐦 Share on Twitter/X
            </button>
            
            <button
              onClick={handleCopyLink}
              className={`px-6 py-3 rounded-lg transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                copySuccess
                  ? "bg-green-600 text-white"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
            >
              {copySuccess ? "✓ Copied!" : "📋 Copy Link"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center"> 
            <Link
              href="/gallery"
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-center"
            >
              🖼️ View Gallery
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

