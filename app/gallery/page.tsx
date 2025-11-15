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
  const [farcasterUser, setFarcasterUser] = useState<{
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  } | null>(null);
  const [nftExists, setNftExists] = useState<boolean | null>(null); // null = not checked yet

  // Fetch metadata if not already loaded
  useEffect(() => {
    if (!metadata && nft.tokenId) {
      // Validate tokenId first
      const tokenIdStr = String(nft.tokenId).trim();
      if (!/^\d+$/.test(tokenIdStr)) {
        console.error(`[Gallery] Invalid tokenId format: ${tokenIdStr}`);
        setNftExists(false);
        return;
      }
      
      fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(tokenIdStr)}`)
        .then((res) => {
          if (res.ok) {
            setNftExists(true);
            return res.json();
          } else if (res.status === 404) {
            setNftExists(false);
            console.warn(`[Gallery] NFT not found for tokenId: ${tokenIdStr}`);
            return null;
          } else {
            setNftExists(null); // Unknown status
            return null;
          }
        })
        .then((data: NFTMetadata | null) => {
          if (data) {
            setMetadata(data);
            // Extract FID from metadata attributes to use as seed for art generation
            const fidAttr = data.attributes?.find((attr: { trait_type: string; value: string | number }) => 
              attr.trait_type === "FID"
            );
            if (fidAttr && fidAttr.value) {
              const extractedFid = String(fidAttr.value);
              setFid(extractedFid);
              
              // Fetch Farcaster user data
              fetch(`/api/farcaster-user?fid=${encodeURIComponent(extractedFid)}`)
                .then((userRes) => userRes.ok ? userRes.json() : null)
                .then((userData) => {
                  if (userData?.user) {
                    setFarcasterUser(userData.user);
                  }
                })
                .catch((err) => {
                  console.warn("Error fetching Farcaster user:", err);
                });
            } else if (nft.fid) {
              // If FID not in metadata but available in nft object, use it
              setFid(nft.fid);
              
              // Fetch Farcaster user data
              fetch(`/api/farcaster-user?fid=${encodeURIComponent(nft.fid)}`)
                .then((userRes) => userRes.ok ? userRes.json() : null)
                .then((userData) => {
                  if (userData?.user) {
                    setFarcasterUser(userData.user);
                  }
                })
                .catch((err) => {
                  console.warn("Error fetching Farcaster user:", err);
                });
            }
          } else if (nft.fid) {
            // If metadata fetch fails but FID is available, use it
            setFid(nft.fid);
            
            // Fetch Farcaster user data
            fetch(`/api/farcaster-user?fid=${encodeURIComponent(nft.fid)}`)
              .then((userRes) => userRes.ok ? userRes.json() : null)
              .then((userData) => {
                if (userData?.user) {
                  setFarcasterUser(userData.user);
                }
              })
              .catch((err) => {
                console.warn("Error fetching Farcaster user:", err);
              });
          }
        })
        .catch((err) => {
          console.error("Error fetching metadata:", err);
          // If fetch fails but FID is available, use it
          if (nft.fid) {
            setFid(nft.fid);
            
            // Fetch Farcaster user data
            fetch(`/api/farcaster-user?fid=${encodeURIComponent(nft.fid)}`)
              .then((userRes) => userRes.ok ? userRes.json() : null)
              .then((userData) => {
                if (userData?.user) {
                  setFarcasterUser(userData.user);
                }
              })
              .catch((err) => {
                console.warn("Error fetching Farcaster user:", err);
              });
          }
        });
    } else if (metadata) {
      // If metadata already loaded, extract FID
      const fidAttr = metadata.attributes?.find((attr: { trait_type: string; value: string | number }) => 
        attr.trait_type === "FID"
      );
      if (fidAttr && fidAttr.value) {
        const extractedFid = String(fidAttr.value);
        setFid(extractedFid);
        
        // Fetch Farcaster user data if not already loaded
        if (!farcasterUser) {
          fetch(`/api/farcaster-user?fid=${encodeURIComponent(extractedFid)}`)
            .then((userRes) => userRes.ok ? userRes.json() : null)
            .then((userData) => {
              if (userData?.user) {
                setFarcasterUser(userData.user);
              }
            })
            .catch((err) => {
              console.warn("Error fetching Farcaster user:", err);
            });
        }
      } else if (nft.fid && !fid) {
        setFid(nft.fid);
        
        // Fetch Farcaster user data if not already loaded
        if (!farcasterUser) {
          fetch(`/api/farcaster-user?fid=${encodeURIComponent(nft.fid)}`)
            .then((userRes) => userRes.ok ? userRes.json() : null)
            .then((userData) => {
              if (userData?.user) {
                setFarcasterUser(userData.user);
              }
            })
            .catch((err) => {
              console.warn("Error fetching Farcaster user:", err);
            });
        }
      }
    } else if (nft.fid && !fid) {
      // If no metadata but FID is available, use it
      setFid(nft.fid);
      
      // Fetch Farcaster user data if not already loaded
      if (!farcasterUser) {
        fetch(`/api/farcaster-user?fid=${encodeURIComponent(nft.fid)}`)
          .then((userRes) => userRes.ok ? userRes.json() : null)
          .then((userData) => {
            if (userData?.user) {
              setFarcasterUser(userData.user);
            }
          })
          .catch((err) => {
            console.warn("Error fetching Farcaster user:", err);
          });
      }
    }
  }, [nft.tokenId, nft.fid, metadata, fid, farcasterUser]);

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
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
      <div className="p-4 sm:p-6">
        {/* Header with Token ID and FID */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Token ID: <span className="text-blue-600">#{nft.tokenId}</span>
            </h2>
            {fid && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">FID:</span>
                <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                  {fid}
                </span>
              </div>
            )}
          </div>
          
          {/* Farcaster User Info */}
          {farcasterUser && (
            <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 sm:gap-3">
                {farcasterUser.avatarUrl && (
                  <Image 
                    src={farcasterUser.avatarUrl} 
                    alt={farcasterUser.displayName || farcasterUser.username || "User"}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full"
                    unoptimized
                  />
                )}
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-purple-900">
                    {farcasterUser.displayName || farcasterUser.username || `FID: ${fid}`}
                  </h4>
                  {farcasterUser.username && (
                    <p className="text-xs sm:text-sm text-purple-600">@{farcasterUser.username}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
            {metadata?.name || nft.name || `NFT #${nft.tokenId}`}
          </h3>
          {metadata?.description && (
            <p className="text-sm text-gray-600 mb-4">
              {metadata.description}
            </p>
          )}
        </div>

        {/* Canvas */}
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-md relative bg-gray-100 rounded-lg p-2">
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

        {/* Attributes and Info */}
        <div className="text-left">
          {metadata?.attributes && metadata.attributes.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm sm:text-base font-semibold mb-2 text-gray-900">Attributes:</h3>
              <div className="flex flex-wrap gap-2">
                {metadata.attributes.map((attr, idx) => (
                  <div 
                    key={idx}
                    className="bg-gray-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm text-gray-900 border border-gray-200"
                  >
                    <span className="font-semibold">{attr.trait_type}:</span>{" "}
                    <span>{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Details Button */}
          <div className="mt-4">
            {!nft.tokenId || !/^\d+$/.test(String(nft.tokenId).trim()) ? (
              <div className="h-8 inline-flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed text-sm sm:text-base">
                Invalid Token ID
              </div>
            ) : nftExists === false ? (
              <div className="h-8 inline-flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-2 bg-red-100 text-red-700 rounded-lg cursor-not-allowed text-sm sm:text-base border border-red-200">
                NFT Not Found
              </div>
            ) : (
              <Link
                href={`/mint/${String(nft.tokenId).trim()}`}
                className="h-8 inline-flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base"
              >
                View Full Details →
              </Link>
            )}
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
        console.log("[Gallery] Fetched NFT data:", { total: data.total, nftsCount: data.nfts?.length, nfts: data.nfts });
        
        if (isMounted) {
          // Check if data.nfts exists and is an array
          if (!data.nfts || !Array.isArray(data.nfts)) {
            console.error("[Gallery] Invalid NFT data:", data);
            setError("Invalid NFT data received from server");
            setIsLoading(false);
            return;
          }

          setTotal(data.total || 0);
          setHasMore(data.hasMore || false);

          // If no NFTs, set empty array and return early
          if (data.nfts.length === 0) {
            console.log("[Gallery] No NFTs found in response");
            if (page === 1) {
              setNfts([]);
            }
            setIsLoading(false);
            return;
          }

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
                } else {
                  console.warn(`[Gallery] Metadata fetch failed for tokenId ${nft.tokenId}:`, metadataResponse.status);
                }
              } catch (error) {
                console.warn(`[Gallery] Failed to fetch metadata for tokenId ${nft.tokenId}:`, error);
              }
              // Return NFT even if metadata fetch fails
              return nft;
            })
          );

          console.log("[Gallery] NFTs with metadata:", { count: nftsWithMetadata.length, nfts: nftsWithMetadata });

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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-2 sm:p-4">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="space_g mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">NFT Gallery</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <p className="text-sm sm:text-base text-gray-600">
                {total > 0 ? (
                  <>
                    <span className="font-semibold text-gray-900">Total: {total}</span> NFTs
                  </>
                ) : (
                  "Loading..."
                )}
              </p>
              {nfts.length > 0 && (
                <p className="text-xs sm:text-sm text-gray-500">
                  Showing {nfts.length} of {total}
                </p>
              )}
            </div>
          </div> 
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Search by Token ID (#123) or FID (123)..."
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
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-white text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 text-sm sm:text-base"
              disabled={isSearching}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSearching || !searchTerm.trim()}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
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
                  className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
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
            <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-gray-50 to-white">
              <div className="w-full max-w-2xl text-center">
                <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 text-gray-900">
                  {searchMetadata?.name || searchResult.name || `NFT #${searchResult.tokenId}`}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-8">
                  {searchMetadata?.description || `This NFT was minted on ${minikitConfig.miniapp.name}`}
                </p>

                <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg mb-4 sm:mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-full max-w-md relative">
                      <ArtGenerator tokenId={searchResult.tokenId} fid={displayFid} width={600} height={600} />
                    </div>
                  </div>
                <div className="text-left">
                  {/* Creator/Owner Info - Name, FID, and Address */}
                  {(searchFarcasterUser || displayFid) && (
                    <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 space_d min-w-0">
                          <h4 className="text-lg font-semibold text-purple-900 break-words">
                            {searchFarcasterUser?.displayName || searchFarcasterUser?.username || (displayFid ? `FID: ${displayFid}` : "Unknown")}
                          </h4>
                          {displayFid && (
                            <p className="text-sm text-purple-600 mt-1">FID: {displayFid}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {searchMetadata?.attributes && searchMetadata.attributes.length > 0 && (
                    <div className="mb-4 space_d">
                      <h3 className="text-lg font-semibold mb-3">Attributes</h3>
                      <div className="flex flex-wrap gap-2">
                        {searchMetadata.attributes.map((attr, idx) => (
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
                  
                  {/* Description Section */}
                  {searchMetadata?.description && (
                    <div className="space_d mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                      <p className="text-sm text-gray-600">{searchMetadata.description}</p>
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

              <div className="space-y-3 sm:space-y-4">
                {/* Share Buttons - Icons in a row */}
                <div className="flex flex-row gap-3 justify-center items-center">
                  <button
                    onClick={handleShareFarcaster}
                    disabled={isSharing}
                    className="w-12 h-12 flex items-center justify-center bg-wrap-600 text-white rounded-full hover:bg-wrap-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 touch-manipulation"
                    title="Share on Farcaster"
                  >
                    {isSharing ? (
                      <span className="text-xl">⏳</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 1080 1080" fill="none"><rect width="1080" height="1080" rx="120" ></rect><path d="M847.387 270V343.023H774.425V415.985H796.779V416.01H847.387V810.795H725.173L725.099 810.434L662.737 515.101C656.791 486.949 641.232 461.477 618.927 443.362C596.623 425.248 568.527 415.275 539.818 415.275H539.575C510.866 415.275 482.77 425.248 460.466 443.362C438.161 461.477 422.602 486.958 416.657 515.101L354.223 810.795H232V416.001H282.608V415.985H304.959V343.023H232V270H847.387Z" fill="white"></path></svg>
                    )}
                  </button>
                  
                  <button
                    onClick={handleShareTwitter}
                    className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 touch-manipulation"
                    title="Share on Twitter/X"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current">
                      <g>
                        <path d="M21.742 21.75l-7.563-11.179 7.056-8.321h-2.456l-5.691 6.714-4.54-6.714H2.359l7.29 10.776L2.25 21.75h2.456l6.035-7.118 4.818 7.118h6.191-.008zM7.739 3.818L18.81 20.182h-2.447L5.29 3.818h2.447z"></path>
                      </g>
                    </svg>
                  </button>
                  
                  <button
                    onClick={handleCopyLink}
                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-xl touch-manipulation ${
                      copySuccess
                        ? "bg-green-600 text-white"
                        : "bg-gray-600 text-white hover:bg-gray-700"
                    }`}
                    title={copySuccess ? "Copied!" : "Copy Link"}
                  >
                    {copySuccess ? "✓" : "📋"}
                  </button>
                </div>

                <Link
                  href={`/mint/${searchResult.tokenId}`}
                  className="nf_m h-12 w-48 inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
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
              <p className="text-sm sm:text-base text-gray-600">{isSearching ? "Searching..." : "Loading NFTs..."}</p>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-sm sm:text-base text-gray-600">No NFTs found</p>
              {searchTerm && (
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  Try searching for a different Token ID or FID
                </p>
              )}
            </div>
          ) : (
            <>
              {console.log("[Gallery] Rendering NFTs:", { count: nfts.length, nfts: nfts.map(n => ({ tokenId: n.tokenId, fid: n.fid })) })}
              <div className="flex flex-col gap-4 items-center w-full">
                {nfts.map((nft) => (
                  <div key={nft.tokenId} className="w-full max-w-2xl space_b mx-auto">
                    <NFTGalleryItem nft={nft} />
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-4 sm:mt-6 text-center">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
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

