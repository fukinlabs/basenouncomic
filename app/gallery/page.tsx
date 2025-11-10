"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { generateArt } from "../../lib/p5-art-generator";
import ArtGenerator from "../components/ArtGenerator";
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { minikitConfig } from "../../minikit.config";

interface NFT {
  tokenId: string;
  owner: string;
  fid: string;
  image?: string;
  name?: string;
}

// Component for individual NFT card with canvas (similar to NFTViewClient)
interface NFTMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

function NFTGalleryItem({ nft }: { nft: NFT }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [fid, setFid] = useState<string | undefined>(nft.fid);

  // Fetch metadata if not already loaded
  useEffect(() => {
    if (!metadata && nft.tokenId) {
      fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(nft.tokenId)}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data: NFTMetadata | null) => {
          if (data) {
            setMetadata(data);
            // Extract FID from metadata attributes to use as seed for art generation
            const fidAttr = data.attributes?.find((attr: { trait_type: string; value: string | number }) => 
              attr.trait_type === "FID"
            );
            if (fidAttr && fidAttr.value) {
              setFid(String(fidAttr.value));
            } else if (nft.fid) {
              // If FID not in metadata but available in nft object, use it
              setFid(nft.fid);
            }
          } else if (nft.fid) {
            // If metadata fetch fails but FID is available, use it
            setFid(nft.fid);
          }
        })
        .catch((err) => {
          console.error("Error fetching metadata:", err);
          // If fetch fails but FID is available, use it
          if (nft.fid) {
            setFid(nft.fid);
          }
        });
    } else if (metadata) {
      // If metadata already loaded, extract FID
      const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
        attr.trait_type === "FID"
      );
      if (fidAttr && fidAttr.value) {
        setFid(String(fidAttr.value));
      } else if (nft.fid && !fid) {
        setFid(nft.fid);
      }
    } else if (nft.fid && !fid) {
      // If no metadata but FID is available, use it
      setFid(nft.fid);
    }
  }, [nft.tokenId, nft.fid, metadata, fid]);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        // Set canvas size (600x600 for consistency)
        canvasRef.current.width = 600;
        canvasRef.current.height = 600;
        // Use FID as seed (matches contract generation), or tokenId as fallback
        // Wait for metadata to load to get FID, but if not available, use tokenId
        const seed = fid || nft.tokenId;
        generateArt(canvasRef.current, { tokenId: seed });
      } catch (error) {
        console.error(`Error generating art for NFT ${nft.tokenId}:`, error);
      }
    }
  }, [nft.tokenId, fid]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            {metadata?.name || nft.name || `NFT #${nft.tokenId}`}
          </h1>
          <p className="text-gray-600 mb-8">
            {metadata?.description || `This NFT was minted on FarcasterP5NFT`}
          </p>

          <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-full max-w-md relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain rounded-lg"
                  style={{ 
                    imageRendering: 'crisp-edges',
                    maxWidth: '100%',
                    height: 'auto'
                  }}
                />
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold mb-2">Token ID: {nft.tokenId}</h2>
              {nft.fid && (
                <p className="text-gray-600 mb-2">FID: {nft.fid}</p>
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
            </div>
          </div>

          <div className="space-y-4">
            <Link
              href={`/mint/${nft.tokenId}`}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              View Full Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const limit = 20;

  // Fetch NFT list (only when not searching)
  useEffect(() => {
    // Don't fetch if user is searching
    if (searchTerm.trim()) {
      return;
    }

    let isMounted = true;

    const fetchNFTs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const offset = (page - 1) * limit;
        const response = await fetch(`/api/nft-list?limit=${limit}&offset=${offset}`);

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error("Failed to fetch NFTs");
        }

        const data = await response.json();
        if (isMounted) {
          setTotal(data.total || 0);
          setHasMore(data.hasMore || false);

          // Fetch metadata for each NFT
          const nftsWithMetadata = await Promise.all(
            data.nfts.map(async (nft: NFT) => {
              try {
                const metadataResponse = await fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(nft.tokenId)}`);
                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json();
                  return {
                    ...nft,
                    image: metadata.image,
                    name: metadata.name,
                  };
                }
              } catch {
                // Ignore metadata fetch errors
              }
              return nft;
            })
          );

          if (isMounted) {
            if (page === 1) {
              setNfts(nftsWithMetadata);
            } else {
              setNfts((prev) => [...prev, ...nftsWithMetadata]);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load NFTs");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchNFTs();

    return () => {
      isMounted = false;
    };
  }, [page, searchTerm]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const [searchResult, setSearchResult] = useState<NFT | null>(null);
  const [searchMetadata, setSearchMetadata] = useState<{ name?: string; description?: string; attributes?: Array<{ trait_type: string; value: string | number }> } | null>(null);
  const [searchFarcasterUser, setSearchFarcasterUser] = useState<{
    username?: string;
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    followersCount?: number;
    followingCount?: number;
    castsCount?: number;
  } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { composeCastAsync } = useComposeCast();

  // Handle search by Token ID or FID
  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      // If search is empty, reload all NFTs
      setPage(1);
      setNfts([]);
      setError(null);
      setSearchResult(null);
      setSearchMetadata(null);
      setSearchFarcasterUser(null);
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResult(null);
    setSearchMetadata(null);
    setSearchFarcasterUser(null);

    // Check if it's a valid number (Token ID or FID)
    if (/^\d+$/.test(term.trim())) {
      const numTerm = term.trim();
      
      // Try to fetch NFT by Token ID first
      try {
        const metadataResponse = await fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(numTerm)}`);
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          // Show the NFT in detailed view
          const foundNFT: NFT = {
            tokenId: numTerm,
            owner: "",
            fid: "",
            image: metadata.image,
            name: metadata.name,
          };
          setSearchResult(foundNFT);
          setSearchMetadata(metadata);
          
          // Extract FID from metadata and fetch Farcaster user
          const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
            attr.trait_type === "FID"
          );
          if (fidAttr && fidAttr.value) {
            const extractedFid = String(fidAttr.value);
            foundNFT.fid = extractedFid;
            
            // Fetch Farcaster user data
            fetch(`/api/farcaster-user?fid=${encodeURIComponent(extractedFid)}`)
              .then((userRes) => userRes.ok ? userRes.json() : null)
              .then((userData) => {
                if (userData?.user) {
                  setSearchFarcasterUser(userData.user);
                }
              })
              .catch((err) => {
                console.warn("Error fetching Farcaster user:", err);
              });
          }
          
          setNfts([]);
          setIsSearching(false);
          return;
        }
      } catch (err) {
        console.error("Error fetching NFT by Token ID:", err);
      }

      // Try to fetch NFT by FID
      try {
        const fidResponse = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(numTerm)}`);
        if (fidResponse.ok) {
          const fidData = await fidResponse.json();
          if (fidData.tokenId) {
            // Fetch metadata for the found NFT
            try {
              const metadataResponse = await fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(fidData.tokenId)}`);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                const foundNFT: NFT = {
                  tokenId: fidData.tokenId,
                  owner: fidData.owner || "",
                  fid: numTerm,
                  image: metadata.image,
                  name: metadata.name,
                };
                setSearchResult(foundNFT);
                setSearchMetadata(metadata);
                
                // Fetch Farcaster user data
                fetch(`/api/farcaster-user?fid=${encodeURIComponent(numTerm)}`)
                  .then((userRes) => userRes.ok ? userRes.json() : null)
                  .then((userData) => {
                    if (userData?.user) {
                      setSearchFarcasterUser(userData.user);
                    }
                  })
                  .catch((err) => {
                    console.warn("Error fetching Farcaster user:", err);
                  });
                
                setNfts([]);
                setIsSearching(false);
                return;
              }
            } catch (err) {
              console.error("Error fetching metadata:", err);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching NFT by FID:", err);
      }

      // If both fail, show error
      setError(`NFT not found for Token ID or FID: ${numTerm}`);
      setNfts([]);
      setIsSearching(false);
    } else {
      // If not a number, filter existing NFTs
      const filtered = nfts.filter(
        (nft) =>
          nft.tokenId.includes(term) ||
          nft.fid.includes(term) ||
          nft.name?.toLowerCase().includes(term.toLowerCase())
      );
      if (filtered.length === 0) {
        setError(`No NFTs found matching: ${term}`);
        setNfts([]);
      } else {
        setNfts(filtered);
      }
      setIsSearching(false);
    }
  };

  const handleShareFarcaster = async () => {
    if (!searchResult) return;
    try {
      setIsSharing(true);
      const shareUrl = `${process.env.NEXT_PUBLIC_ROOT_URL || window.location.origin}/mint/${searchResult.tokenId}`;
      const text = `🎨 Check out my NFT #${searchResult.tokenId} on ${minikitConfig.miniapp.name}! ${shareUrl}`;
      
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
    if (!searchResult) return;
    try {
      const shareUrl = `${process.env.NEXT_PUBLIC_ROOT_URL || window.location.origin}/mint/${searchResult.tokenId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Error copying link:", error);
    }
  };

  const handleShareTwitter = () => {
    if (!searchResult) return;
    const shareUrl = `${process.env.NEXT_PUBLIC_ROOT_URL || window.location.origin}/mint/${searchResult.tokenId}`;
    const text = `🎨 Check out my NFT #${searchResult.tokenId} on ${minikitConfig.miniapp.name}!`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

  return (
    <main className="min-h-screen bg-black p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">🎨 NFT Gallery</h1>
            <p className="text-sm sm:text-base text-gray-400">
              {total > 0 ? `Total: ${total} NFTs` : "Loading..."}
            </p>
          </div>
          <Link
            href="/mint"
            prefetch={false}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Mint NFT
          </Link>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Search by Token ID or FID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value.trim()) {
                  // Reset to show all NFTs when search is cleared
                  setPage(1);
                  setNfts([]);
                  setError(null);
                  setSearchResult(null);
                  setSearchMetadata(null);
                }
              }}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 text-sm sm:text-base"
              disabled={isSearching}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSearching || !searchTerm.trim()}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
              {searchTerm && (
                <button
                  type="button"
              onClick={() => {
                setSearchTerm("");
                setPage(1);
                setNfts([]);
                setError(null);
                setSearchResult(null);
                setSearchMetadata(null);
              }}
                  className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm sm:text-base text-red-600">{error}</p>
          </div>
        )}

        {/* Search Result - Detailed View (like NFTViewClient) */}
        {searchResult ? (() => {
          // Extract FID from metadata attributes (same as NFTViewClient)
          const fidAttr = searchMetadata?.attributes?.find((attr: { trait_type: string; value: string | number }) => 
            attr.trait_type === "FID"
          );
          const displayFid = fidAttr && fidAttr.value ? String(fidAttr.value) : (searchResult.fid || undefined);
          
          return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
              <div className="w-full max-w-2xl text-center">
                <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 text-white">
                  {searchMetadata?.name || searchResult.name || `NFT #${searchResult.tokenId}`}
                </h1>
                <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-8">
                  {searchMetadata?.description || `This NFT was minted on ${minikitConfig.miniapp.name}`}
                </p>

                <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg mb-4 sm:mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-full max-w-md relative">
                      <ArtGenerator tokenId={searchResult.tokenId} fid={displayFid} width={600} height={600} />
                    </div>
                  </div>
                <div className="text-left">
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">Token ID: {searchResult.tokenId}</h2>
                  
                  {/* Farcaster User Info */}
                  {searchFarcasterUser && (
                    <div className="mb-4 p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2">
                        {searchFarcasterUser.avatarUrl && (
                          <Image 
                            src={searchFarcasterUser.avatarUrl} 
                            alt={searchFarcasterUser.displayName || searchFarcasterUser.username || "User"}
                            width={48}
                            height={48}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                            unoptimized
                          />
                        )}
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-purple-900">
                            {searchFarcasterUser.displayName || searchFarcasterUser.username || `FID: ${displayFid}`}
                          </h3>
                          {searchFarcasterUser.username && (
                            <p className="text-xs sm:text-sm text-purple-600">@{searchFarcasterUser.username}</p>
                          )}
                        </div>
                      </div>
                      {searchFarcasterUser.bio && (
                        <p className="text-xs sm:text-sm text-purple-800 mt-2">{searchFarcasterUser.bio}</p>
                      )}
                      <div className="flex gap-3 sm:gap-4 mt-2 text-xs text-purple-600">
                        {searchFarcasterUser.followersCount !== undefined && (
                          <span>👥 {searchFarcasterUser.followersCount} followers</span>
                        )}
                        {searchFarcasterUser.castsCount !== undefined && (
                          <span>📝 {searchFarcasterUser.castsCount} casts</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {displayFid && !searchFarcasterUser && (
                    <p className="text-sm sm:text-base text-gray-600 mb-2">FID: {displayFid}</p>
                  )}
                  {searchMetadata?.attributes && searchMetadata.attributes.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-2">Attributes:</h3>
                      <div className="flex flex-wrap gap-2">
                        {searchMetadata.attributes.map((attr, idx) => (
                          <div 
                            key={idx}
                            className="bg-gray-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm"
                          >
                            <span className="font-semibold">{attr.trait_type}:</span>{" "}
                            <span>{attr.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    Share this page to show off your NFT in Farcaster feeds!
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Share Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                  <button
                    onClick={handleShareFarcaster}
                    disabled={isSharing}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-sm sm:text-base"
                  >
                    {isSharing ? "Sharing..." : "📱 Share on Farcaster"}
                  </button>
                  
                  <button
                    onClick={handleShareTwitter}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors font-semibold text-sm sm:text-base"
                  >
                    🐦 Share on Twitter/X
                  </button>
                  
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors font-semibold text-sm sm:text-base ${
                      copySuccess
                        ? "bg-green-600 text-white"
                        : "bg-gray-600 text-white hover:bg-gray-700"
                    }`}
                  >
                    {copySuccess ? "✓ Copied!" : "📋 Copy Link"}
                  </button>
                </div>

                <Link
                  href={`/mint/${searchResult.tokenId}`}
                  className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  View Full Page →
                </Link>
              </div>
            </div>
          </div>
          );
        })() : (
          /* NFT Grid */
          (isLoading || isSearching) && nfts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-sm sm:text-base text-gray-400">{isSearching ? "Searching..." : "Loading NFTs..."}</p>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-sm sm:text-base text-gray-400">No NFTs found</p>
              {searchTerm && (
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  Try searching for a different Token ID or FID
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {nfts.map((nft) => (
                  <NFTGalleryItem key={nft.tokenId} nft={nft} />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-4 sm:mt-6 text-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  >
                    {isLoading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </main>
  );
}

