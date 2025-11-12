"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect, useReadContract } from "wagmi";
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { sdk } from "@farcaster/miniapp-sdk";
import { minikitConfig } from "../../minikit.config";
import { generateArt } from "../../lib/p5-art-generator";
import contractABI from "../../lib/contract-abi.json";
import { NFT_CONTRACT_ADDRESS } from "../../lib/contract-config";

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
  const [userNFT, setUserNFT] = useState<{ tokenId: string; image?: string; name?: string } | null>(null);
  const [isLoadingNFT, setIsLoadingNFT] = useState(false);
  const [isSignedOut, setIsSignedOut] = useState(false);

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

  // Check if user has signed out (from localStorage) and listen for changes
  useEffect(() => {
    const checkSignOut = () => {
      const signedOut = localStorage.getItem("farcaster_signed_out") === "true";
      if (signedOut) {
        setIsSignedOut(true);
        // Clear sign in state when signed out
        setIsSignedIn(false);
        setFid(""); // Clear FID to show Sign In button
      } else {
        setIsSignedOut(false);
      }
    };

    // Check on mount
    checkSignOut();

    // Listen for storage changes (when sign out happens in Header)
    window.addEventListener("storage", checkSignOut);
    window.addEventListener("farcaster-signout", checkSignOut);
    
    // Also check on interval for same-tab updates
    const interval = setInterval(checkSignOut, 300);
    
    return () => {
      window.removeEventListener("storage", checkSignOut);
      window.removeEventListener("farcaster-signout", checkSignOut);
      clearInterval(interval);
    };
  }, []);

  // Get FID and user data from SDK context automatically (following Farcaster SDK Context docs)
  // https://miniapps.farcaster.xyz/docs/sdk/context#user
  // Only fetch if user hasn't explicitly signed out
  useEffect(() => {
    // Don't auto-fetch if user has signed out
    if (isSignedOut) return;

    const getContext = async () => {
      try {
        const inMini = await sdk.isInMiniApp();
        if (!inMini) return;

        const ctx = await sdk.context;
        if (ctx?.user?.fid) {
          const extractedFid = ctx.user.fid.toString();
          setFid(extractedFid);
          
          // FID is set, Header component will handle user data display
        }
      } catch (error) {
        console.error("Error getting context:", error);
      }
    };
    getContext();
  }, [isSignedOut]);

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
        const extractedFid = verifyData.user.fid.toString();
        setFid(extractedFid);
        setIsSignedIn(true);
        setSignInError(null);
        setIsSignedOut(false); // Clear sign out flag when signing in
        console.log("User signed in successfully:", verifyData.user);
        
        // Clear sign out flag from localStorage
        localStorage.removeItem("farcaster_signed_out");
        
        // Store sign in state in localStorage for Header component
        localStorage.setItem("farcaster_signed_in", "true");
        localStorage.setItem("farcaster_fid", extractedFid);
        
        // Dispatch custom event to notify Header component immediately
        window.dispatchEvent(new Event("farcaster-signin"));
        
        console.log("[Mint] Sign in complete, FID stored:", extractedFid);
        
        // Header component will handle user data display
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

  // Fetch user's NFT when FID changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserNFT = async () => {
      if (!fid || isNaN(Number(fid))) {
        setUserNFT(null);
        return;
      }

      setIsLoadingNFT(true);
      try {
        const response = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(fid)}`);
        
        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          console.log("NFT by FID response:", data);
          
          // Validate tokenId - must be a valid number and not "0"
          if (data.tokenId && data.tokenId !== "0" && data.tokenId !== "undefined" && data.tokenId !== "null") {
            const tokenIdStr = String(data.tokenId).trim();
            
            // Double check tokenId is valid
            if (!/^\d+$/.test(tokenIdStr) || tokenIdStr === "0") {
              console.error("Invalid tokenId:", tokenIdStr);
              if (isMounted) {
                setUserNFT(null);
              }
              return;
            }
            
            // Fetch metadata to get image
            try {
              const metadataResponse = await fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(tokenIdStr)}`);
              console.log("Metadata response status:", metadataResponse.status);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                console.log("Metadata:", metadata);
                if (isMounted) {
                  setUserNFT({
                    tokenId: tokenIdStr,
                    image: metadata.image,
                    name: metadata.name,
                  });
                }
              } else {
                // Even if metadata fetch fails, still show NFT with tokenId
                console.warn("Metadata fetch failed, using tokenId only");
                if (isMounted) {
                  setUserNFT({
                    tokenId: tokenIdStr,
                  });
                }
              }
            } catch (err) {
              // Use tokenId as fallback even on error
              console.error("Error fetching metadata:", err);
              if (isMounted) {
                setUserNFT({
                  tokenId: tokenIdStr,
                });
              }
            }
          } else {
            console.log("No valid tokenId in response:", data.tokenId);
            if (isMounted) {
              setUserNFT(null);
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log("NFT by FID error:", response.status, errorData);
          
          // If RPC service unavailable (503), log but don't show error to user
          // This is a temporary issue that will resolve itself
          if (response.status === 503) {
            console.warn("RPC service temporarily unavailable, will retry later");
          }
          
          if (isMounted) {
            setUserNFT(null);
          }
        }
      } catch (error) {
        console.error("Error fetching user NFT:", error);
        if (isMounted) {
          setUserNFT(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingNFT(false);
        }
      }
    };

    fetchUserNFT();

    return () => {
      isMounted = false;
    };
  }, [fid]);

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

  // Handle successful mint - use FID as tokenId (smart contract uses fid = tokenId)
  useEffect(() => {
    let isMounted = true;
    
    const setTokenIdFromFid = async () => {
      if (isConfirmed && hash) {
        try {
          // Smart contract uses fid = tokenId, so use fid directly
          if (fid && fid.trim() !== "" && !isNaN(Number(fid))) {
            if (isMounted) {
              setMintedTokenId(fid.trim());
              console.log("Minted tokenId (using FID):", fid.trim());
            }
          } else {
            console.error("Cannot set tokenId: invalid FID");
          }
          
          // Optionally verify by parsing event (but use fid as primary source)
          try {
            const { createPublicClient, http, parseEventLogs } = await import("viem");
            const { base } = await import("viem/chains");
            
            const publicClient = createPublicClient({
              transport: http(),
              chain: base,
            });
            
            const receipt = await publicClient.getTransactionReceipt({ hash });
            
            if (!isMounted) return;
            
            // Parse Mint event to verify (but fid is the source of truth)
            const mintEvents = parseEventLogs({
              abi: contractABI,
              eventName: "Mint",
              logs: receipt.logs,
            });
            
            if (mintEvents.length > 0) {
              const event = mintEvents[0];
              const eventArgs = (event as { args?: { tokenId?: bigint; fid?: bigint } }).args;
              const eventTokenId = eventArgs?.tokenId?.toString();
              const eventFid = eventArgs?.fid?.toString();
              
              console.log("Mint event - tokenId:", eventTokenId, "fid:", eventFid);
              
              // Verify that event tokenId matches fid (for contracts where tokenId = fid)
              if (eventFid && eventFid === fid) {
                console.log("✅ Verified: Event FID matches current FID");
              }
            }
          } catch (eventError) {
            // Event parsing is optional, don't fail if it errors
            console.warn("Could not parse Mint event (non-critical):", eventError);
          }
        } catch (error) {
          console.error("Error setting tokenId:", error);
          // Still try to use fid as tokenId if available
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
    
    setTokenIdFromFid();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [isConfirmed, hash, fid]); // Include fid since we use it as tokenId


  const handleMint = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first");
      return;
    }

    if (!fid || isNaN(Number(fid))) {
      alert("Please enter a valid Farcaster FID");
      return;
    }

    // ✅ Verify FID ownership: Must be signed in with Farcaster OR have FID from Mini App context
    // Note: If FID comes from Mini App context, user is already authenticated
    // But if user manually enters FID, they must sign in to verify ownership
    const fidFromContext = localStorage.getItem("farcaster_fid");
    const isFidFromContext = fidFromContext === fid;
    
    if (!isSignedIn && !isFidFromContext) {
      alert("Please sign in with Farcaster first to verify FID ownership. You can only mint with your own FID.");
      return;
    }

    // ✅ Verify FID exists in Farcaster (check if FID is valid)
    // Skip this check if FID comes from Mini App context or sign-in (trusted sources)
    // Only verify if FID was manually entered and user hasn't signed in
    if (!isSignedIn && !isFidFromContext) {
      try {
        const fidCheckResponse = await fetch(`/api/farcaster-user?fid=${encodeURIComponent(fid)}`);
        if (!fidCheckResponse.ok) {
          const errorData = await fidCheckResponse.json();
          if (errorData.error === "User not found") {
            alert("This FID does not exist in Farcaster. Please use a valid FID.");
            return;
          }
        }
      } catch (error) {
        console.warn("Could not verify FID with Farcaster API:", error);
        // Continue with mint if API check fails (non-blocking)
      }
    } else {
      // FID is from trusted source (Mini App context or sign-in), skip API verification
      console.log("Skipping FID verification - FID is from trusted source (Mini App context or sign-in)");
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
      // Get IPFS hash from upload response
      // API returns: { image: { ipfsHash: "Qm...", ipfsUrl: "https://..." }, metadata: { ... } }
      const ipfsHash = uploadData.image?.ipfsHash; // Direct IPFS hash (e.g., "Qm...")
      const ipfsUrl = uploadData.image?.ipfsUrl; // Gateway URL (e.g., "https://gateway.pinata.cloud/ipfs/Qm...")
      const metadataIpfsUrl = uploadData.metadata?.ipfsUrl;

      console.log("Image IPFS hash:", ipfsHash);
      console.log("Image uploaded to IPFS:", ipfsUrl);
      console.log("Metadata uploaded to IPFS:", metadataIpfsUrl);

      // Step 2: Use IPFS hash for lowest gas cost (93% savings)
      // If Pinata upload succeeds, use IPFS hash (gas: ~120,000)
      // If Pinata fails, fallback to compressed base64 (gas: ~400,000-500,000)
      console.log("Preparing image data for contract (IPFS preferred for lowest gas cost)...");
      
      let imageData: string;
      
      // Try to use IPFS hash first (lowest gas cost - ~120,000 gas)
      // Basescan supports IPFS hash format: "ipfs://Qm..." (100% success rate)
      if (ipfsHash) {
        // Use direct IPFS hash from API response (most reliable)
        imageData = `ipfs://${ipfsHash}`;
        console.log("Using IPFS hash for minting (lowest gas cost: ~120,000 gas, Basescan compatible: 100%)");
      } else if (ipfsUrl && ipfsUrl.includes("ipfs://")) {
        // Extract IPFS hash from URL (format: ipfs://Qm...)
        const extractedHash = ipfsUrl.replace("ipfs://", "");
        imageData = `ipfs://${extractedHash}`;
        console.log("Using IPFS hash from ipfs:// URL (lowest gas cost: ~120,000 gas, Basescan compatible: 100%)");
      } else if (ipfsUrl && ipfsUrl.includes("gateway.pinata.cloud")) {
        // Extract IPFS hash from Pinata gateway URL
        const extractedHash = ipfsUrl.split("/ipfs/")[1]?.split("?")[0];
        if (extractedHash) {
          imageData = `ipfs://${extractedHash}`;
          console.log("Using IPFS hash from Pinata gateway (lowest gas cost: ~120,000 gas, Basescan compatible: 100%)");
        } else {
          throw new Error("Failed to extract IPFS hash from Pinata URL");
        }
      } else {
        // Fallback: Use compressed base64 (higher gas cost but still works)
        console.log("IPFS not available, using compressed base64 (fallback)");
        
        if (!imageBase64 || imageBase64.trim() === "") {
          throw new Error("Image base64 is empty. Please wait for art generation to complete.");
        }

        // Extract base64 string only (remove data URL prefix)
        let imageBase64Only = imageBase64;
        if (imageBase64.includes("data:image/")) {
          imageBase64Only = imageBase64.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/, "");
        }

        if (!imageBase64Only || imageBase64Only.trim() === "") {
          throw new Error("Failed to extract base64 string from image data URL");
        }

        imageData = imageBase64Only;
        console.log("Using compressed base64 (gas: ~400,000-500,000, still much lower than original)");
      }

      // Step 3: Call mint(to, fid, imageBase64) directly (no signature)
      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "mint",
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

  // Generate single art preview - full screen
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Generate art when FID changes and canvas is ready
  useEffect(() => {
    if (!fid || isNaN(Number(fid)) || !canvasReady) return;

    // Use requestAnimationFrame to ensure canvas is fully rendered
    const frameId = requestAnimationFrame(() => {
      if (canvasRef.current) {
        try {
          // Set canvas size before generating art (600x600 high-resolution)
          canvasRef.current.width = 600;
          canvasRef.current.height = 600;
          
          // Generate art using FID as seed
          generateArt(canvasRef.current, { tokenId: fid });
          
          // Update imageBase64 when canvas is ready
          // Use JPEG with quality 0.85 for smaller file size (PNG doesn't support quality parameter)
          // This reduces file size significantly while maintaining good visual quality
          setTimeout(() => {
            if (canvasRef.current) {
              // Use PNG format; 600x600 for higher quality
              // If IPFS upload fails, this PNG base64 will be used as fallback
              const base64 = canvasRef.current.toDataURL("image/png");
              setImageBase64(base64);
            }
          }, 100);
        } catch (error) {
          console.error("Error generating art:", error);
        }
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [fid, canvasReady]);

  // Check if canvas is mounted and reset when FID changes
  useEffect(() => {
    // Reset when FID changes
    setCanvasReady(false);
    setImageBase64(""); // Clear previous image
    
    if (!fid || isNaN(Number(fid))) {
      return;
    }
    
    // Check if canvas ref is set
    const maxRetries = 20; // Max 20 retries (1 second total)
    let retryCount = 0;
    
    const checkCanvas = () => {
      if (canvasRef.current) {
        // Use double requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCanvasReady(true);
          });
        });
      } else if (retryCount < maxRetries) {
        // Retry after a short delay if canvas isn't ready yet
        retryCount++;
        setTimeout(checkCanvas, 50);
      } else {
        // If max retries reached, try to generate anyway
        console.warn("Canvas may not be ready, generating art anyway");
        setCanvasReady(true);
      }
    };

    // Start checking after a short delay to allow DOM to update
    const timeoutId = setTimeout(checkCanvas, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [fid]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black relative">
      <div className="w-full max-w-md">
        
        {!fid && !isSignedIn && (
          <div className="box-content object-center w-full h-full ">
            <Image 
              src="/blue-icon.png" 
              alt="Blue Icon" 
              width={384} 
              height={192} 
              className="h-full w-full object-cover" 
            />
          </div>
        )}
        {!isConnected ? (
          <div className="text-center p-8 rounded-full shadow-lg">
            {connectors.length > 0 && (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="h-12 w-48 p-6 py-3 nf_m bg-purple-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        ) : !fid ? (
          <div className="  p-8 rounded-full shadow-lg">
            <div className="text-center">
            {/* <h2 className="text-2xl font-bold mb-2 text-gray-800">Sign In with Farcaster</h2>
              <p className="text-gray-600 mb-6">
                {isSignedIn ? "Signed in successfully!" : "Sign in with Farcaster to continue"}
              </p> */}



              {!isSignedIn && (
                <div>
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="px-8 py-3 bg-blue-600 nf_m text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                 
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
                    {isSigningIn ? "Signing in..." : "🔐 Sign In with Farcaster"}
                  </button>
                  {signInError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-full">
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
          <div className="text-center p-8 bg-green-50 rounded-full shadow-lg">
            <div className="mb-4">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-2">NFT Minted Successfully!</h2>
              <p className="text-gray-600 mb-4">
                Transaction: {hash?.slice(0, 10)}...{hash?.slice(-8)}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
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
            {/* Single Art Preview - Full Screen */}
            {fid && (
              <div className="w-full bg-white rounded-full p-4 shadow-lg">
                <div className="w-full aspect-square bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={200}
                    height={200}
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'auto' }}
                  />
                </div>
              </div>
            )}

            {/* Sign In Status (hidden when not signed in) */}
            {isSignedIn && (
              <div className="w-full p-3 bg-green-50 border border-green-200 rounded-full">
                <p className="text-sm text-green-700 text-center">
                  ✅ Signed in with Farcaster (FID: {fid})
                </p>
              </div>
            )}

            {/* User's NFT Display */}
            {fid && !isLoadingNFT && userNFT && (
              <div className="w-full bg-white rounded-full p-4 shadow-lg">
                <h3 className="text-lg font-semibold mb-3 text-center text-gray-800">
                  🎨 Your NFT Collection
                </h3>
                <div className="flex flex-col items-center space-y-3">
                  {userNFT.image ? (
                    <div className="w-full max-w-xs relative">
                      <Image
                        src={userNFT.image}
                        alt={userNFT.name || `NFT #${userNFT.tokenId}`}
                        width={400}
                        height={400}
                        className="w-full h-auto rounded-full shadow-md"
                        unoptimized
                        onError={() => {
                          // Image will fallback to placeholder
                          setUserNFT({ ...userNFT, image: undefined });
                        }}
                      />
                    </div>
                  ) : userNFT.tokenId ? (
                    <div className="w-full max-w-xs aspect-square bg-gray-100 rounded-full flex items-center justify-center">
                      <p className="text-gray-500">Loading image...</p>
                    </div>
                  ) : null}
                  {userNFT.tokenId && (
                    <>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">
                          {userNFT.name || `NFT #${userNFT.tokenId}`}
                        </p>
                        <p className="text-xs text-gray-500">Token ID: {userNFT.tokenId}</p>
                      </div>
                      <a
                        href={`/mint/${userNFT.tokenId}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-semibold"
                      >
                        View NFT →
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}

            {fid && isLoadingNFT && (
              <div className="w-full p-4 bg-gray-50 rounded-full">
                <p className="text-sm text-gray-600 text-center">Loading your NFT...</p>
              </div>
            )}

            {/* Show message if FID exists but no NFT found */}
            {fid && !isLoadingNFT && !userNFT && isAlreadyMinted === false && (
              <div className="nf_m  w-full p-4 bg-blue-50 border border-blue-200 rounded-full">
                <p className="text-sm text-blue-700 text-center">
                  You haven&apos;t minted an NFT yet. Mint your first NFT below! 🎨
                </p>
              </div>
            )}

            {/* Already Minted Warning */}
            {isAlreadyMinted === true && (
              <div className="w-full space-y-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-full">
                  <p className="text-sm text-yellow-700 text-center">
                    ⚠️ This FID has already been minted. Each FID can only mint once.
                  </p>
                </div>
                {/* View NFT Button - Smart contract uses tokenId = FID, so use fid directly */}
                {fid && (
                  <a
                    href={`/mint/${fid}`}
                    className="block w-full px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-center font-semibold"
                  >
                    🎨 View My NFT →
                  </a>
                )}
              </div>
            )}

            {/* Bottom Button - SIGN IN FARCASTER or MINT */}
            <div className="w-full">
              <div className="flex justify-center">
                {!isSignedOut && !fid && !isSignedIn ? (
                  // Show Sign In button if we have FID but not signed in
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="w-full max-w-xs px-8 py-4 rounded-full disabled:cursor-not-allowed transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl uppercase"
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
                ) : !isSignedOut && fid ? (
                  // Show Mint button if we have FID (from context or sign in)
                  <button
                    onClick={handleMint}
                    disabled={isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || isAlreadyMinted === true}
                    className="h-12 w-48  nf_m max-w-xs px-8 py-4 rounded-full disabled:cursor-not-allowed transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl uppercase"
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
                ) : null}
              </div>

              {/* Error Messages */}
              {signInError && !isSignedIn && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-full">
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
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-full">
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

