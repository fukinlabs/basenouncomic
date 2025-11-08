"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect, useReadContract } from "wagmi";
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { sdk } from "@farcaster/miniapp-sdk";
import { minikitConfig } from "../../minikit.config";
import { generateArt } from "../../lib/p5-art-generator";
import contractABI from "../../lib/contract-abi.json";

// NFT Contract Address on Base
const NFT_CONTRACT_ADDRESS = "0xe81B2748149d089eBdaE6Fee36230D98BA00FF49" as const;

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { composeCastAsync } = useComposeCast();
  const [fid, setFid] = useState<string>("");
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isAlreadyMinted, setIsAlreadyMinted] = useState<boolean | null>(null);
  const [isInterfaceReady, setIsInterfaceReady] = useState(false);
  const [hasCalledReady, setHasCalledReady] = useState(false);

  // Call ready when interface is fully loaded (following Farcaster docs)
  // https://miniapps.farcaster.xyz/docs/guides/loading
  // Wait for your app to be ready, then call sdk.actions.ready()
  // This is required to hide the splash screen and display your content
  // You should call ready as soon as possible while avoiding jitter and content reflows
  // Don't call ready until your interface has loaded to avoid jitter and content reflow
  useEffect(() => {
    let cancelled = false;
    let frameId2: number | null = null;
    
    // Use requestAnimationFrame to ensure DOM is ready and avoid jitter
    // This ensures the UI skeleton/placeholder is rendered before hiding splash screen
    const frameId1 = requestAnimationFrame(() => {
      if (cancelled) return;
      // Use double RAF to ensure layout is complete
      frameId2 = requestAnimationFrame(() => {
        if (!cancelled) {
          setIsInterfaceReady(true);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId1);
      if (frameId2 !== null) {
        cancelAnimationFrame(frameId2);
      }
    };
  }, []);

  // Call ready when interface is ready (following Farcaster best practices)
  useEffect(() => {
    if (isInterfaceReady && !hasCalledReady) {
      setHasCalledReady(true);
      const callReady = async () => {
        try {
          await sdk.actions.ready();
        } catch (error) {
          console.error("Error calling sdk.actions.ready():", error);
        }
      };
      callReady();
    }
  }, [isInterfaceReady, hasCalledReady]);

  // Get FID from SDK context automatically (following Farcaster SDK Context docs)
  // https://miniapps.farcaster.xyz/docs/sdk/context#open-mini-app
  useEffect(() => {
    const getContext = async () => {
      try {
        const inMini = await sdk.isInMiniApp();
        if (!inMini) return;

        const ctx = await sdk.context;
        if (ctx?.user?.fid) {
          setFid(ctx.user.fid.toString());
        }
      } catch (error) {
        console.error("Error getting context:", error);
      }
    };
    getContext();
  }, []);

  // Sign In with Farcaster (following Farcaster Auth Guide)
  // https://miniapps.farcaster.xyz/docs/sdk/actions/sign-in
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setSignInError(null); // Clear previous errors
    try {
      // Generate a random nonce (at least 8 alphanumeric characters)
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Request Sign In with Farcaster credential
      const result = await sdk.actions.signIn({
        nonce,
        acceptAuthAddress: true, // Support Auth Addresses for better UX
      });

      console.log("Sign In result:", result);

      // Verify the message on server
      const verifyResponse = await fetch("/api/verify-signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: result.message,
          signature: result.signature,
          nonce,
        }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || "Failed to verify sign in");
      }

      const verifyData = await verifyResponse.json();
      if (verifyData.success && verifyData.user?.fid) {
        setFid(verifyData.user.fid.toString());
        setIsSignedIn(true);
        setSignInError(null);
        console.log("User signed in successfully:", verifyData.user);
      }
    } catch (error) {
      console.error("Sign In error:", error);
      // If user cancels, silently return (don't show error)
      if (error instanceof Error && error.name === "RejectedByUser") {
        // User cancelled - just return without showing error
        return;
      } else {
        // Show error for other failures
        setSignInError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Check if FID has already been minted
  const { data: mintedFidResult, refetch: refetchMintedFid } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "mintedFid",
    args: fid ? [BigInt(fid)] : undefined,
    query: {
      enabled: !!fid && !isNaN(Number(fid)),
    },
  });

  // Update isAlreadyMinted state when mintedFidResult changes
  useEffect(() => {
    if (mintedFidResult !== undefined) {
      setIsAlreadyMinted(mintedFidResult as boolean);
    }
  }, [mintedFidResult]);

  // Refetch mintedFid when fid changes
  useEffect(() => {
    if (fid && !isNaN(Number(fid))) {
      refetchMintedFid();
    }
  }, [fid, refetchMintedFid]);

  const { 
    writeContract, 
    data: hash, 
    isPending: isPendingWrite,
    error: writeError 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: txError 
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Reset minting state when user rejects/cancels transaction
  useEffect(() => {
    if (writeError) {
      const errorMessage = writeError?.message || "";
      const isUserRejected = 
        errorMessage.toLowerCase().includes("user rejected") ||
        errorMessage.toLowerCase().includes("rejected the request") ||
        errorMessage.toLowerCase().includes("user denied") ||
        errorMessage.toLowerCase().includes("user cancelled");
      
      if (isUserRejected) {
        setIsMinting(false);
      }
    }
  }, [writeError]);

  // Handle successful mint - extract tokenId from transaction receipt
  useEffect(() => {
    let isMounted = true;
    
    const extractTokenId = async () => {
      if (isConfirmed && hash) {
        try {
          // Get transaction receipt to extract tokenId from MintForFID event
          const { createPublicClient, http, parseEventLogs } = await import("viem");
          const { base } = await import("viem/chains");
          
          const publicClient = createPublicClient({
            transport: http(),
            chain: base,
          });
          
          const receipt = await publicClient.getTransactionReceipt({ hash });
          
          if (!isMounted) return; // Check if component is still mounted
          
          // Parse MintForFID event to get tokenId
          const mintEvents = parseEventLogs({
            abi: contractABI,
            eventName: "MintForFID",
            logs: receipt.logs,
          });
          
          if (mintEvents.length > 0) {
            const event = mintEvents[0];
            // Access args from the parsed event
            // Type assertion needed because parseEventLogs returns Log type
            const eventArgs = (event as { args?: { tokenId?: bigint } }).args;
            const tokenId = eventArgs?.tokenId?.toString();
            if (tokenId && isMounted) {
              setMintedTokenId(tokenId);
              console.log("Minted tokenId:", tokenId);
            } else if (isMounted) {
              // Fallback: use FID as tokenId if event parsing fails, but validate FID first
              if (fid && fid.trim() !== "" && !isNaN(Number(fid))) {
                console.warn("Could not extract tokenId from event, using FID as fallback");
                setMintedTokenId(fid.trim());
              } else {
                console.error("Cannot use FID as fallback: invalid FID");
                // Don't set tokenId if FID is invalid
              }
            }
          } else if (isMounted) {
            // Fallback: use FID as tokenId if no event found, but validate FID first
            if (fid && fid.trim() !== "" && !isNaN(Number(fid))) {
              console.warn("No MintForFID event found, using FID as fallback");
              setMintedTokenId(fid.trim());
            } else {
              console.error("Cannot use FID as fallback: invalid FID");
            }
          }
        } catch (error) {
          console.error("Error extracting tokenId:", error);
          // Fallback: use FID as tokenId, but validate FID first
          if (isMounted && fid && fid.trim() !== "" && !isNaN(Number(fid))) {
            setMintedTokenId(fid.trim());
          }
        } finally {
          if (isMounted) {
            setIsMinting(false);
          }
        }
      }
    };
    
    extractTokenId();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash]); // fid is intentionally excluded to prevent unnecessary re-runs


  const handleMint = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!fid || isNaN(Number(fid))) {
      alert("Please enter a valid Farcaster FID");
      return;
    }

    if (!imageBase64) {
      alert("Please wait for art generation to complete");
      return;
    }

    // Check if FID has already been minted
    if (isAlreadyMinted === true) {
      alert("This FID has already been minted. Each FID can only mint once.");
      return;
    }

    setIsMinting(true);
    try {
      // Step 1: Upload image to Pinata IPFS
      console.log("Uploading image to Pinata IPFS...");
      const uploadResponse = await fetch("/api/upload-pinata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          tokenId: fid, // Use FID as tokenId for now
          fid,
        }),
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        console.error("Upload error:", error);
        
        // If Pinata is not configured, fallback to base64 (not recommended)
        if (error.error?.includes("Pinata API credentials not configured")) {
          console.warn("Pinata not configured, using base64 directly (not recommended for production)");
          // Continue with base64 as fallback
        } else {
          throw new Error(error.error || "Failed to upload to Pinata");
        }
      }

      const uploadData = await uploadResponse.json();
      const ipfsHash = uploadData.image?.ipfsHash;
      const ipfsUrl = uploadData.image?.ipfsUrl;
      const metadataIpfsHash = uploadData.metadata?.ipfsHash;
      const metadataIpfsUrl = uploadData.metadata?.ipfsUrl;

      console.log("Image uploaded to IPFS:", ipfsUrl);
      console.log("Metadata uploaded to IPFS:", metadataIpfsUrl);

      // Step 2: Mint NFT with metadata IPFS hash (preferred) or image IPFS hash (fallback) or base64
      // Use metadata IPFS hash so contract can return proper tokenURI with full metadata
      const imageData = metadataIpfsHash 
        ? `ipfs://${metadataIpfsHash}` 
        : (ipfsHash ? `ipfs://${ipfsHash}` : imageBase64);

      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "mintForFid",
        args: [address, BigInt(fid), imageData],
      });
    } catch (error) {
      console.error("Mint error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isUserRejected = 
        errorMessage.toLowerCase().includes("user rejected") ||
        errorMessage.toLowerCase().includes("rejected the request") ||
        errorMessage.toLowerCase().includes("user denied") ||
        errorMessage.toLowerCase().includes("user cancelled");
      
      // Don't show alert if user rejected/cancelled - it's expected behavior
      if (!isUserRejected) {
        alert(`Mint failed: ${errorMessage}`);
      }
      setIsMinting(false);
    }
  };

  const handleShare = async () => {
    if (!mintedTokenId) return;

    try {
      const shareUrl = `${process.env.NEXT_PUBLIC_ROOT_URL || "http://localhost:3000"}/mint/${mintedTokenId}`;
      const text = `🎉 I just minted my NFT on ${minikitConfig.miniapp.name}! Check it out: ${shareUrl}`;
      
      const result = await composeCastAsync({
        text: text,
        embeds: [shareUrl]
      });

      if (result?.cast) {
        console.log("Cast created successfully:", result.cast.hash);
      }
    } catch (error) {
      console.error("Error sharing cast:", error);
    }
  };

  // Generate 9 art previews for the grid
  const gridRefs = useRef<(HTMLCanvasElement | null)[]>(Array(9).fill(null));
  const [canvasesReady, setCanvasesReady] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate art when FID changes and canvases are ready
  useEffect(() => {
    if (!fid || isNaN(Number(fid)) || !canvasesReady) return;

    // Use requestAnimationFrame to ensure canvas is fully rendered
    const frameId = requestAnimationFrame(() => {
      // Generate 9 variations using FID + index as seed
      gridRefs.current.forEach((canvas, index) => {
        if (canvas) {
          try {
            const seed = Number(fid) + index;
            generateArt(canvas, { tokenId: seed.toString() });
            
            // Update imageBase64 when first canvas is ready
            if (index === 0) {
              // Use setTimeout to ensure canvas is fully drawn
              setTimeout(() => {
                const base64 = canvas.toDataURL("image/png");
                setImageBase64(base64);
              }, 100);
            }
          } catch (error) {
            console.error(`Error generating art for grid ${index}:`, error);
          }
        }
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [fid, canvasesReady]);

  // Check if all canvases are mounted and reset when FID changes
  useEffect(() => {
    // Reset when FID changes
    setCanvasesReady(false);
    setImageBase64(""); // Clear previous image
    
    if (!fid || isNaN(Number(fid))) {
      return;
    }

    // Reset retry count when FID changes
    retryCountRef.current = 0;
    
    // Check if all canvas refs are set
    const maxRetries = 20; // Max 20 retries (1 second total)
    
    const checkCanvases = () => {
      const allCanvasesReady = gridRefs.current.every(canvas => canvas !== null);
      
      if (allCanvasesReady) {
        // Use double requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCanvasesReady(true);
          });
        });
      } else if (retryCountRef.current < maxRetries) {
        // Retry after a short delay if canvases aren't ready yet
        retryCountRef.current++;
        // Clear previous timeout if exists
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(checkCanvases, 50);
      } else {
        // If max retries reached, try to generate anyway with available canvases
        console.warn("Some canvases may not be ready, generating art anyway");
        setCanvasesReady(true);
      }
    };

    // Start checking after a short delay to allow DOM to update
    const timeoutId = setTimeout(checkCanvases, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0; // Reset retry count on cleanup
    };
  }, [fid]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md">
        {!isConnected ? (
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <p className="text-gray-600 mb-4">Please connect your wallet to mint</p>
            {connectors.length > 0 && (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        ) : !fid ? (
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Sign In with Farcaster</h2>
              <p className="text-gray-600 mb-6">
                {isSignedIn ? "Signed in successfully!" : "Sign in with Farcaster to continue"}
              </p>
              {!isSignedIn && (
                <div>
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    {isSigningIn ? "Signing in..." : "🔐 Sign In with Farcaster"}
                  </button>
                  {signInError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{signInError}</p>
                    </div>
                  )}
                </div>
              )}
              {isSignedIn && (
                <p className="text-sm text-green-600 mt-2">Waiting for FID...</p>
              )}
            </div>
          </div>
        ) : mintedTokenId ? (
          <div className="text-center p-8 bg-green-50 rounded-lg shadow-lg">
            <div className="mb-4">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-2">NFT Minted Successfully!</h2>
              <p className="text-gray-600 mb-4">
                Transaction: {hash?.slice(0, 10)}...{hash?.slice(-8)}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Share on Farcaster
            </button>
            <div className="mt-4">
              <a
                href={`/mint/${mintedTokenId}`}
                className="text-blue-600 hover:underline"
              >
                View your NFT →
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            {/* White Square with 3x3 Grid */}
            {fid && (
              <div className="w-full bg-white rounded-lg p-4 shadow-lg">
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-gray-100 rounded overflow-hidden"
                    >
                      <canvas
                        ref={(el) => {
                          gridRefs.current[index] = el;
                        }}
                        width={600}
                        height={600}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'auto' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sign In Status (hidden when not signed in) */}
            {isSignedIn && (
              <div className="w-full p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 text-center">
                  ✅ Signed in with Farcaster (FID: {fid})
                </p>
              </div>
            )}

            {/* Already Minted Warning */}
            {isAlreadyMinted === true && (
              <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700 text-center">
                  ⚠️ This FID has already been minted. Each FID can only mint once.
                </p>
              </div>
            )}

            {/* Bottom Button - SIGN IN FARCASTER or MINT */}
            <div className="w-full">
              <div className="flex justify-center">
                {!isSignedIn && fid ? (
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="w-full max-w-xs px-8 py-4 rounded-lg disabled:cursor-not-allowed transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl uppercase"
                    style={{
                      backgroundColor: isSigningIn ? '#9ca3af' : '#9333ea',
                      color: '#ffffff',
                      padding: '15px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSigningIn) {
                        e.currentTarget.style.backgroundColor = '#7e22ce';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSigningIn) {
                        e.currentTarget.style.backgroundColor = '#9333ea';
                      }
                    }}
                  >
                    {isSigningIn ? "Signing in..." : "SIGN IN FARCASTER"}
                  </button>
                ) : (
                  <button
                    onClick={handleMint}
                    disabled={isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || isAlreadyMinted === true}
                    className="w-full max-w-xs px-8 py-4 rounded-lg disabled:cursor-not-allowed transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl uppercase"
                    style={{
                      backgroundColor: (isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || isAlreadyMinted === true) ? '#9ca3af' : '#9333ea',
                      color: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      if (!(isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || isAlreadyMinted === true)) {
                        e.currentTarget.style.backgroundColor = '#7e22ce';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || isAlreadyMinted === true)) {
                        e.currentTarget.style.backgroundColor = '#9333ea';
                      }
                    }}
                  >
                    {isMinting || isPendingWrite || isConfirming
                      ? "Minting..."
                      : isAlreadyMinted === true
                      ? "ALREADY MINTED"
                      : "MINT"}
                  </button>
                )}
              </div>

              {/* Error Messages */}
              {signInError && !isSignedIn && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{signInError}</p>
                  <button
                    onClick={() => setSignInError(null)}
                    className="mt-2 text-xs text-red-600 hover:underline mx-auto block"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {(writeError || txError) && (() => {
                const errorMessage = writeError?.message || txError?.message || "";
                const isUserRejected = 
                  errorMessage.toLowerCase().includes("user rejected") ||
                  errorMessage.toLowerCase().includes("rejected the request") ||
                  errorMessage.toLowerCase().includes("user denied") ||
                  errorMessage.toLowerCase().includes("user cancelled");
                
                // Don't show error if user rejected/cancelled - it's expected behavior
                if (isUserRejected) {
                  return null;
                }
                
                return (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm text-center">
                      Error: {errorMessage}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

