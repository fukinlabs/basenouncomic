"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { sdk } from "@farcaster/miniapp-sdk";
import { minikitConfig } from "../../minikit.config";
import { generateArt } from "../../lib/p5-art-generator";
import contractABI from "../../lib/contract-abi.json";
import { NFT_CONTRACT_ADDRESS } from "../../lib/contract-config";

export default function MintPage() {
  const { address } = useAccount(); // Keep address as fallback
  const { composeCastAsync } = useComposeCast();
  // Initialize states with localStorage values to prevent flicker
  const [fid, setFid] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const signedOut = localStorage.getItem("farcaster_signed_out") === "true";
      if (signedOut) return "";
      return localStorage.getItem("farcaster_fid") || "";
    }
    return "";
  });
  
  const [signInAddress, setSignInAddress] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const signedOut = localStorage.getItem("farcaster_signed_out") === "true";
      if (signedOut) return null;
      return localStorage.getItem("farcaster_address") || null;
    }
    return null;
  });
  
  const [isSignedIn, setIsSignedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      const signedOut = localStorage.getItem("farcaster_signed_out") === "true";
      if (signedOut) return false;
      const signedIn = localStorage.getItem("farcaster_signed_in") === "true";
      const storedFid = localStorage.getItem("farcaster_fid");
      return signedIn && !!storedFid;
    }
    return false;
  });
  
  const [isSignedOut, setIsSignedOut] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("farcaster_signed_out") === "true";
    }
    return false;
  });
  
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isAlreadyMinted, setIsAlreadyMinted] = useState<boolean | null>(null);
  const [userNFT, setUserNFT] = useState<{ tokenId: string; image?: string; name?: string; source?: string } | null>(null);
  const [isLoadingNFT, setIsLoadingNFT] = useState(false);
  const [tokenIdError, setTokenIdError] = useState<string | null>(null);
  const [showSignInSuccess, setShowSignInSuccess] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  // Check if running in Farcaster miniapp
  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        const inMini = await sdk.isInMiniApp();
        setIsInMiniApp(inMini);
        console.log("[Mint] isInMiniApp:", inMini);
      } catch (error) {
        console.error("[Mint] Error checking miniapp:", error);
        setIsInMiniApp(false);
      }
    };
    checkMiniApp();
  }, []);

  // Helper function to check if error is user rejection
  const isUserRejected = (errorMessage: string): boolean => {
    const message = errorMessage.toLowerCase();
    return (
      message.includes("user rejected") ||
      message.includes("rejected the request") ||
      message.includes("user denied") ||
      message.includes("user cancelled")
    );
  };

  // Call ready when interface is fully loaded (following Farcaster docs)
  // https://miniapps.farcaster.xyz/docs/getting-started#making-your-app-display
  // Important: Must call sdk.actions.ready() to hide splash screen
  useEffect(() => {
    const callReady = async () => {
      try {
        const inMini = await sdk.isInMiniApp();
        if (inMini) {
          // Call ready() when interface is ready to be displayed
          await sdk.actions.ready();
          console.log("[Mint] Called sdk.actions.ready()");
        }
      } catch (error) {
        console.error("[Mint] Error calling ready():", error);
      }
    };
    
    // Call ready() after component mounts and DOM is ready
    callReady();
  }, []);

  // Log initial state from localStorage (states are already initialized with localStorage values)
  useEffect(() => {
    const signedIn = localStorage.getItem("farcaster_signed_in") === "true";
    const storedFid = localStorage.getItem("farcaster_fid");
    const storedAddress = localStorage.getItem("farcaster_address");
    const signedOut = localStorage.getItem("farcaster_signed_out") === "true";
    
    console.log("[Mint] Initial state from localStorage:", {
      signedIn,
      storedFid,
      storedAddress,
      signedOut
    });
    
    console.log("[Mint] Current component state:", {
      currentIsSignedIn: isSignedIn,
      currentFid: fid,
      currentIsSignedOut: isSignedOut
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only log on mount, states are already initialized with localStorage values

  // Check if user has signed out (from localStorage) and listen for changes
  useEffect(() => {
    const checkSignOut = () => {
      const signedOut = localStorage.getItem("farcaster_signed_out") === "true";
      // Only update state if value actually changed to prevent unnecessary re-renders
      if (signedOut && !isSignedOut) {
        setIsSignedOut(true);
        // Clear sign in state when signed out
        setIsSignedIn(false);
        setFid(""); // Clear FID to show Sign In button
        setSignInAddress(null); // Clear address from Sign In
        setUserNFT(null); // Clear user NFT data
        setIsAlreadyMinted(null); // Reset minted status
        setMintedTokenId(null); // Clear minted token ID
        setIsLoadingNFT(false); // Reset loading state
        console.log("[Mint] Sign out detected - cleared all user data");
      } else if (!signedOut && isSignedOut) {
        setIsSignedOut(false);
        console.log("[Mint] Sign out cleared");
      }
    };

    // Check on mount
    checkSignOut();

    // Listen for storage changes (when sign out happens in Header)
    window.addEventListener("storage", checkSignOut);
    window.addEventListener("farcaster-signout", checkSignOut);
    
    // Check on interval for same-tab updates - reduced frequency to prevent excessive checks
    const interval = setInterval(checkSignOut, 2000); // Increased to 2 seconds to reduce checks
    
    return () => {
      window.removeEventListener("storage", checkSignOut);
      window.removeEventListener("farcaster-signout", checkSignOut);
      clearInterval(interval);
    };
  }, [isSignedOut]); // Add dependency to prevent stale closures

  // Get FID and user data from SDK context automatically (following Farcaster SDK Context docs)
  // https://miniapps.farcaster.xyz/docs/sdk/context#user
  // Only fetch if user hasn't explicitly signed out and hasn't signed in yet
  useEffect(() => {
    // Don't auto-fetch if user has signed out or already signed in
    if (isSignedOut || isSignedIn) {
      console.log("[Mint] Skipping context fetch:", { isSignedOut, isSignedIn });
      return;
    }

    const getContext = async () => {
      try {
        const inMini = await sdk.isInMiniApp();
        console.log("[Mint] isInMiniApp:", inMini);
        if (!inMini) {
          console.log("[Mint] Not in Mini App, skipping context fetch");
          return;
        }

        const ctx = await sdk.context;
        console.log("[Mint] SDK context:", ctx);
        if (ctx?.user?.fid) {
          const extractedFid = ctx.user.fid.toString();
          console.log("[Mint] Found FID from context:", extractedFid);
          // Only set FID if not already signed in (to allow manual sign in)
          // Context FID is just for display, manual sign in is required for verification
          if (!isSignedIn) {
            setFid(extractedFid);
            console.log("[Mint] Set FID from context (will require manual sign in for verification)");
          }
        } else {
          console.log("[Mint] No FID found in context");
        }
      } catch (error) {
        console.error("[Mint] Error getting context:", error);
      }
    };
    getContext();
  }, [isSignedOut, isSignedIn]);

  // Sign In with Farcaster using Quick Auth
  // Doc: https://miniapps.farcaster.xyz/docs/sdk/quick-auth
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setSignInError(null);
    console.log("[Mint] Starting Farcaster Quick Auth sign in...");
    
    try {
      // 1. Get a Quick Auth token from the SDK
      // This will either reuse an existing session or prompt the user to approve
      const { token } = await sdk.quickAuth.getToken();
      
      if (!token) {
        throw new Error("Failed to get Quick Auth token");
      }
      
      console.log("[Mint] Got Quick Auth token");

      // 2. Send the token to our backend to verify and get user info
      const verifyResponse = await fetch("/api/verify-signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || errorData.details || `Verification failed (${verifyResponse.status})`);
      }

      const verifyData = await verifyResponse.json();
      
      if (verifyData.success && verifyData.user?.fid) {
        const extractedFid = verifyData.user.fid.toString();
        const extractedAddress = verifyData.user.address;
        
        setFid(extractedFid);
        setSignInAddress(extractedAddress || null);
        setIsSignedIn(true);
        setSignInError(null);
        setIsSignedOut(false);
        setIsFadingOut(false);
        setShowSignInSuccess(true);
        console.log("User signed in successfully via Quick Auth:", verifyData.user);
        
        // Store session data
        localStorage.removeItem("farcaster_signed_out");
        localStorage.setItem("farcaster_signed_in", "true");
        localStorage.setItem("farcaster_fid", extractedFid);
        if (extractedAddress) {
          localStorage.setItem("farcaster_address", extractedAddress);
        }
        
        // Notify other components
        window.dispatchEvent(new Event("farcaster-signin"));
      }
    } catch (error) {
      console.error("Quick Auth error:", error);
      // Check for user rejection
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (isUserRejected(errorMessage)) {
        return;
      }
      setSignInError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Fade out sign in success message after 3 seconds
  useEffect(() => {
    if (showSignInSuccess) {
      // Start fade out after 3 seconds
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 3000);

      // Remove element after fade out animation completes (500ms)
      const removeTimer = setTimeout(() => {
        setShowSignInSuccess(false);
        setIsFadingOut(false);
      }, 3500); // 3000ms delay + 500ms fade animation

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [showSignInSuccess]);

  // Check if FID has already been minted
  // Contract address: 0xBc3BB4918D53E11B29920FD339cce8781a45ABf4
  const { data: mintedFidResult, refetch: refetchMintedFid, error: mintedFidError } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: contractABI,
    functionName: "mintedFid",
    args: fid ? [BigInt(fid)] : undefined,
    query: {
      enabled: !!fid && !isNaN(Number(fid)),
    },
  });
  
  // Log contract address for debugging
  useEffect(() => {
    if (fid) {
      console.log("Checking mintedFid for FID:", fid, "on contract:", NFT_CONTRACT_ADDRESS);
    }
  }, [fid]);
  
  // Log error if contract call fails
  useEffect(() => {
    if (mintedFidError) {
      console.error("Error checking mintedFid:", mintedFidError);
      console.error("Contract address:", NFT_CONTRACT_ADDRESS);
    }
  }, [mintedFidError]);

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

  // Robust metadata fetching with multiple fallback sources
  const fetchUserNFTMetadata = useCallback(async (fidToFetch: string, isMounted: { current: boolean }) => {
    if (!fidToFetch || isNaN(Number(fidToFetch))) {
      return null;
    }

    console.log(`[fetchUserNFTMetadata] 🔍 Starting multi-source fetch for FID: ${fidToFetch}`);
    
    try {
      // Step 1: Get tokenId from contract Mint event
      const tokenResponse = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(fidToFetch)}`);
      
      if (!isMounted.current) return null;

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        console.warn(`[fetchUserNFTMetadata] ❌ Failed to get tokenId for FID ${fidToFetch}:`, errorData);
        return null;
      }

      const tokenData = await tokenResponse.json();
      console.log(`[fetchUserNFTMetadata] ✅ Got tokenId from Mint event:`, tokenData);
      
      // Validate tokenId
      if (!tokenData.tokenId || tokenData.tokenId === "undefined" || tokenData.tokenId === "null") {
        console.warn(`[fetchUserNFTMetadata] ❌ Invalid tokenId in response:`, tokenData.tokenId);
        return null;
      }
      
      const tokenIdStr = String(tokenData.tokenId).trim();
      if (!/^\d+$/.test(tokenIdStr)) {
        console.error(`[fetchUserNFTMetadata] ❌ Invalid tokenId format:`, tokenIdStr);
        return null;
      }

      // Step 2: Fetch metadata from multiple sources with fallback
      // Try contract first (fastest), then Pinata IPFS as backup
      const metadataSources = [
        {
          name: 'contract_tokenURI',
          url: `/api/nft-metadata?tokenId=${encodeURIComponent(tokenIdStr)}`,
          timeout: 8000, // 8 seconds for contract calls
        },
        // If contract fails, we could add Pinata as backup here
        // But currently our contract stores everything in tokenURI directly
      ];

      let successfulMetadata = null;
      let lastError: Error | null = null;

      // Try each source sequentially (contract first, then fallbacks)
      for (const source of metadataSources) {
        if (!isMounted.current) return null;
        
        try {
          console.log(`[fetchUserNFTMetadata] 📥 Trying ${source.name} for tokenId ${tokenIdStr}...`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), source.timeout);
          
          const metadataResponse = await fetch(source.url, {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache', // Force fresh data
            }
          });
          
          clearTimeout(timeoutId);
          
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            
            console.log(`[fetchUserNFTMetadata] ✅ Success from ${source.name}:`, {
              tokenId: tokenIdStr,
              name: metadata.name,
              hasImage: !!metadata.image,
              source: source.name,
              imageType: metadata.image?.startsWith('data:') ? 'base64' : 'url'
            });
            
            // Extract and verify tokenId from metadata
            let verifiedTokenId = tokenIdStr;
            if (metadata.name && typeof metadata.name === 'string') {
              const nameMatch = metadata.name.match(/#(\d+)$/);
              if (nameMatch && nameMatch[1]) {
                verifiedTokenId = nameMatch[1];
                console.log(`[fetchUserNFTMetadata] 🔍 Verified tokenId from metadata: ${verifiedTokenId}`);
                
                if (verifiedTokenId !== tokenIdStr) {
                  console.warn(`[fetchUserNFTMetadata] ⚠️ TokenId mismatch: metadata=${verifiedTokenId}, event=${tokenIdStr}. Using metadata value.`);
                }
              }
            }
            
            successfulMetadata = {
              tokenId: verifiedTokenId,
              image: metadata.image,
              name: metadata.name,
              source: source.name // Track which source provided the data
            };
            
            break; // Success! Exit loop
            
          } else {
            throw new Error(`HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`);
          }
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn(`[fetchUserNFTMetadata] ⏱️ Timeout from ${source.name} (${source.timeout}ms)`);
          } else {
            console.warn(`[fetchUserNFTMetadata] ❌ Error from ${source.name}:`, {
              error: error instanceof Error ? error.message : String(error),
              tokenId: tokenIdStr
            });
          }
          
          // Continue to next source
          continue;
        }
      }

      // Return result or fallback
      if (successfulMetadata) {
        console.log(`[fetchUserNFTMetadata] 🎉 Final result for FID ${fidToFetch}:`, successfulMetadata);
        return successfulMetadata;
      } else {
        // All sources failed, return minimal data with tokenId only
        console.error(`[fetchUserNFTMetadata] 💥 All sources failed for FID ${fidToFetch}. Using tokenId-only fallback.`, {
          lastError: lastError?.message,
          tokenId: tokenIdStr
        });
        
        return {
          tokenId: tokenIdStr,
          source: 'fallback_tokenid_only'
        };
      }
      
    } catch (error) {
      console.error(`[fetchUserNFTMetadata] 💥 Unexpected error for FID ${fidToFetch}:`, {
        error: error instanceof Error ? error.message : String(error),
        type: 'unexpected_error'
      });
      return null;
    }
  }, []); // No dependencies needed as function is pure

  // Fetch user's NFT when FID changes (debounced to prevent duplicate calls)
  useEffect(() => {
    const isMounted = { current: true };
    let timeoutId: NodeJS.Timeout;
    
    const debouncedFetchUserNFT = () => {
      if (!fid || isNaN(Number(fid)) || isSignedOut || !isSignedIn) {
        setUserNFT(null);
        setIsLoadingNFT(false);
        setTokenIdError(null);
        return;
      }

      // Debounce to prevent rapid consecutive calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!isMounted.current) return;
        
        setIsLoadingNFT(true);
        setTokenIdError(null);
        
        const nftData = await fetchUserNFTMetadata(fid, isMounted);
        
        if (isMounted.current) {
          setUserNFT(nftData);
          setIsLoadingNFT(false);
          
          if (!nftData) {
            console.log(`[fetchUserNFT] No NFT found for FID: ${fid}`);
          }
        }
      }, 300); // 300ms debounce
    };

    debouncedFetchUserNFT();

    return () => {
      isMounted.current = false;
      clearTimeout(timeoutId);
    };
  }, [fid, isSignedOut, isSignedIn, fetchUserNFTMetadata]); // Add fetchUserNFTMetadata dependency

  // Retry fetching NFT metadata when isAlreadyMinted is true but we don't have NFT data yet
  // This handles the case where contract says it's minted but we haven't loaded the metadata
  useEffect(() => {
    const isMounted = { current: true };
    let retryTimeoutId: NodeJS.Timeout;
    
    // Only retry if contract says it's minted but we don't have NFT data
    if (isAlreadyMinted === true && !userNFT && !isLoadingNFT && fid && !isSignedOut && isSignedIn) {
      console.log(`[retry] Contract says FID ${fid} is minted but no NFT data loaded. Retrying...`);
      
      // Retry after a short delay to avoid race condition
      retryTimeoutId = setTimeout(async () => {
        if (!isMounted.current) return;
        
        setIsLoadingNFT(true);
        setTokenIdError(null);
        
        const nftData = await fetchUserNFTMetadata(fid, isMounted);
        
        if (isMounted.current) {
          setUserNFT(nftData);
          setIsLoadingNFT(false);
          
          if (!nftData) {
            setTokenIdError("Failed to load NFT metadata. The NFT may have been minted recently and is still processing.");
          }
        }
      }, 1000); // 1 second delay for retry
    }
    
    return () => {
      isMounted.current = false;
      clearTimeout(retryTimeoutId);
    };
  }, [isAlreadyMinted, userNFT, isLoadingNFT, fid, isSignedOut, isSignedIn, fetchUserNFTMetadata]);

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
      console.error("Write contract error:", writeError);
      if (isUserRejected(errorMessage)) {
        setIsMinting(false);
      } else {
        // Show error if not user rejection
        alert(`Mint failed: ${errorMessage}`);
        setIsMinting(false);
      }
    }
  }, [writeError]);

  // Handle transaction error
  useEffect(() => {
    if (txError) {
      const errorMessage = txError?.message || "";
      console.error("Transaction error:", txError);
      alert(`Transaction failed: ${errorMessage}`);
      setIsMinting(false);
    }
  }, [txError]);

  // Handle successful mint - use tokenId from Mint event (smart contract uses tokenId = nextId++)
  useEffect(() => {
    let isMounted = true;
    
    const setTokenIdFromEvent = async () => {
      if (isConfirmed && hash) {
        try {
          // Parse Mint event to get actual tokenId (smart contract uses tokenId = nextId++)
          try {
            const { createPublicClient, http, parseEventLogs } = await import("viem");
            const { base } = await import("viem/chains");
            
            const publicClient = createPublicClient({
              transport: http(),
              chain: base,
            });
            
            const receipt = await publicClient.getTransactionReceipt({ hash });
            
            if (!isMounted) return;
            
            // Parse Mint event to get tokenId (smart contract uses tokenId = nextId++)
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
              
              // Use tokenId from event (smart contract uses tokenId = nextId++)
              // ✅ Accept tokenId = "0" (first NFT minted)
              if (eventTokenId && eventTokenId !== "undefined" && eventTokenId !== "null" && /^\d+$/.test(eventTokenId)) {
                if (isMounted) {
                  setMintedTokenId(eventTokenId);
                  console.log("✅ Minted tokenId (from event):", eventTokenId, "FID:", eventFid);
                }
              } else {
                console.error("Invalid tokenId from event:", eventTokenId);
                // Fallback: try to fetch from /api/nft-by-fid
                if (fid && fid.trim() !== "" && !isNaN(Number(fid))) {
                  try {
                    const nftResponse = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(fid.trim())}`);
                    if (nftResponse.ok) {
                      const nftData = await nftResponse.json();
                      // ✅ Accept tokenId = "0" (first NFT minted)
                      if (nftData.tokenId && nftData.tokenId !== "undefined" && nftData.tokenId !== "null" && /^\d+$/.test(nftData.tokenId)) {
                        if (isMounted) {
                          setMintedTokenId(nftData.tokenId);
                          console.log("✅ Minted tokenId (from API):", nftData.tokenId);
                        }
                      }
                    }
                  } catch (apiError) {
                    console.error("Error fetching tokenId from API:", apiError);
                  }
                }
              }
              
              // Verify that event FID matches current FID
              if (eventFid && eventFid === fid) {
                console.log("✅ Verified: Event FID matches current FID");
              }
            } else {
              console.warn("No Mint event found in transaction");
              // Fallback: try to fetch from /api/nft-by-fid
              if (fid && fid.trim() !== "" && !isNaN(Number(fid))) {
                try {
                  const nftResponse = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(fid.trim())}`);
                  if (nftResponse.ok) {
                    const nftData = await nftResponse.json();
                    // ✅ Accept tokenId = "0" (first NFT minted)
                    if (nftData.tokenId && nftData.tokenId !== "undefined" && nftData.tokenId !== "null" && /^\d+$/.test(nftData.tokenId)) {
                      if (isMounted) {
                        setMintedTokenId(nftData.tokenId);
                        console.log("✅ Minted tokenId (from API fallback):", nftData.tokenId);
                      }
                    }
                  }
                } catch (apiError) {
                  console.error("Error fetching tokenId from API:", apiError);
                }
              }
            }
          } catch (eventError) {
            // Event parsing failed, try to fetch from /api/nft-by-fid
            console.warn("Could not parse Mint event, trying API fallback:", eventError);
            if (fid && fid.trim() !== "" && !isNaN(Number(fid))) {
              try {
                const nftResponse = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(fid.trim())}`);
                if (nftResponse.ok) {
                  const nftData = await nftResponse.json();
                  // ✅ Accept tokenId = "0" (first NFT minted)
                  if (nftData.tokenId && nftData.tokenId !== "undefined" && nftData.tokenId !== "null" && /^\d+$/.test(String(nftData.tokenId))) {
                    if (isMounted) {
                      setMintedTokenId(nftData.tokenId);
                      console.log("✅ Minted tokenId (from API fallback):", nftData.tokenId);
                    }
                  }
                }
              } catch (apiError) {
                console.error("Error fetching tokenId from API:", apiError);
              }
            }
          }
        } catch (error) {
          console.error("Error setting tokenId:", error);
        } finally {
          if (isMounted) {
            setIsMinting(false);
          }
        }
      }
    };
    
    setTokenIdFromEvent();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [isConfirmed, hash, fid]);


  const handleMint = async () => {
    // Use address from Farcaster Sign In (signInAddress) instead of wallet connection
    const mintAddress = signInAddress || address;
    
    if (!mintAddress) {
      alert("Please sign in with Farcaster first to get your address");
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
      // Step 0: Read nextId from contract to predict tokenId (tokenId = nextId++)
      // This allows us to use the correct tokenId in external_url
      let predictedTokenId: string | null = null;
      try {
        const { createPublicClient, http, parseAbiItem } = await import("viem");
        const { base } = await import("viem/chains");
        
        const publicClient = createPublicClient({
          transport: http(),
          chain: base,
        });
        
        const nextId = await publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS,
          abi: [parseAbiItem("function nextId() view returns (uint256)")],
          functionName: "nextId",
        });
        
        // tokenId = nextId++ means the next mint will get this nextId value
        predictedTokenId = nextId.toString();
        console.log("Predicted tokenId from nextId():", predictedTokenId);
      } catch (error) {
        console.warn("Could not read nextId from contract, will use fid as fallback:", error);
      }
      
      // Step 1: Upload image to Pinata IPFS
      // Use predictedTokenId (from nextId()) for metadata, fallback to fid if not available
      console.log("Uploading image to Pinata IPFS...");
      const uploadResponse = await fetch("/api/upload-pinata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          tokenId: predictedTokenId || null, // Use predicted tokenId (from nextId()), null if not available
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

      // Step 3: Prepare external URL
      const rootUrl = process.env.NEXT_PUBLIC_ROOT_URL || 
        process.env.NEXT_PUBLIC_URL || 
        (typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000");
      // Use predicted tokenId (from nextId()) for external_url
      // tokenId = nextId++ means the next mint will get this nextId value
      const externalUrl = `${rootUrl}/mint/${predictedTokenId || fid}`; // Use tokenId if available, fallback to fid

      // Step 4: Call mint function (no signature required)
      // Verify contract address before minting
      console.log("Minting to contract:", NFT_CONTRACT_ADDRESS);
      console.log("Mint args:", { 
        to: mintAddress, 
        fid, 
        imageDataLength: imageData.length, 
        externalUrl
      });
      
      console.log("Calling writeContract with:", {
        address: NFT_CONTRACT_ADDRESS,
        functionName: "mint",
        args: {
          to: mintAddress,
          fid: BigInt(fid),
          imageBase64: imageData.substring(0, 50) + "...", // Log first 50 chars
          imageDataLength: imageData.length,
          externalUrl
        }
      });

      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "mint",
        args: [mintAddress, BigInt(fid), imageData, externalUrl],
      });
    } catch (error) {
      console.error("Mint error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Don't show alert if user rejected/cancelled - it's expected behavior
      if (!isUserRejected(errorMessage)) {
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
  const userNFTCanvasRef = useRef<HTMLCanvasElement | null>(null); // Canvas for displaying minted NFT
  const [canvasReady, setCanvasReady] = useState(false);
  const [artSeed, setArtSeed] = useState<string | null>(null); // Use tokenId if available, otherwise FID

  // Update artSeed: prefer tokenId (from minted NFT) over FID (for preview)
  useEffect(() => {
    // Priority: userNFT.tokenId > mintedTokenId > FID
    // This ensures Canvas above matches Canvas below when NFT exists
    if (userNFT?.tokenId) {
      setArtSeed(userNFT.tokenId);
    } else if (mintedTokenId) {
      setArtSeed(mintedTokenId);
    } else if (fid && !isNaN(Number(fid))) {
      setArtSeed(fid);
    } else {
      setArtSeed(null);
    }
  }, [userNFT?.tokenId, mintedTokenId, fid]);

  // Generate art when artSeed changes and canvas is ready
  // Use FID if available (matches NFTViewClient.tsx), otherwise use tokenId
  useEffect(() => {
    // Priority: FID > tokenId (matches NFTViewClient.tsx: fid || tokenId)
    const seedToUse = fid || artSeed;
    
    if (!seedToUse || !canvasReady) return;

    // Use requestAnimationFrame to ensure canvas is fully rendered
    const frameId = requestAnimationFrame(() => {
      if (canvasRef.current) {
        try {
          // Set canvas size before generating art (600x600 high-resolution)
          canvasRef.current.width = 600;
          canvasRef.current.height = 600;
          
          // Generate art using FID if available (matches NFTViewClient.tsx), otherwise use tokenId
          generateArt(canvasRef.current, { tokenId: seedToUse });
          
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
  }, [fid, artSeed, canvasReady]);

  // Check if canvas is mounted and reset when artSeed changes
  useEffect(() => {
    // Reset when artSeed changes (FID or tokenId)
    setCanvasReady(false);
    setImageBase64(""); // Clear previous image
    
    if (!artSeed) {
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
  }, [artSeed]);

  // Generate art on userNFTCanvasRef when userNFT.tokenId is available
  // Use FID if available (matches NFTViewClient.tsx), otherwise use tokenId
  useEffect(() => {
    // Priority: FID > tokenId (matches NFTViewClient.tsx: fid || tokenId)
    const seedToUse = fid || artSeed;
    
    if (!seedToUse || !userNFTCanvasRef.current) return;

    const frameId = requestAnimationFrame(() => {
      if (userNFTCanvasRef.current) {
        try {
          // Set canvas size (600x600 for high resolution)
          userNFTCanvasRef.current.width = 600;
          userNFTCanvasRef.current.height = 600;
          
          // Generate art using FID if available (matches NFTViewClient.tsx), otherwise use tokenId
          generateArt(userNFTCanvasRef.current, { tokenId: seedToUse });
        } catch (error) {
          console.error("Error generating NFT art on canvas:", error);
        }
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [fid, artSeed]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center pt-8 p-4 bg-gradient-to-b relative">
      <div className="w-full max-w-md">
        
        {/* Show icon only if no FID and not in miniapp */}
        {(!fid || (isSignedOut && !isInMiniApp) || (!isSignedIn && !isInMiniApp)) && (
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
        {/* Show Sign In only if: not in miniapp OR (in miniapp but no FID and not signed in) */}
        {(!fid || (isSignedOut && !isInMiniApp) || (!isSignedIn && !isInMiniApp)) ? (
          <div className="p-8 ">
            <div className="text-center">
              {(!isSignedIn || isSignedOut) && (
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
                    {isSigningIn ? "Signing in..." : "Sign In"}
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
          <div className="text-center p-8 bg-green-50  shadow-lg">
            <div className="mb-4">
              <div className="text-2xl mb-4">✅</div>
              {/* Show the NFT that user just minted (canvas NFT preview) */}
              <div className="flex justify-center mb-6">
                <div className="w-full max-w-xs overflow-hidden  border border-green-100 py-4 px-2 flex flex-col items-center">
                  <canvas
                    ref={userNFTCanvasRef}
                    width={200}
                    height={200}
                    className="w-full h-auto object-contain rounded mb-2"
                    style={{ imageRendering: 'auto', maxWidth: '200px', maxHeight: '200px', background: '#f3f4f6' }}
                  />
                 </div>
              </div>
              <h2 className="text-2xl font-bold mb-2"
                style={{  color: '#000000'}}
              
              >NFT Minted Successfully!</h2>
              <div className="mb-4 p-4 bg-white rounded-lg border border-green-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">Token ID</p>
                    <p className="text-lg font-mono text-gray-900">{mintedTokenId}</p>
                  </div>
                  {fid && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Farcaster FID</p>
                      <p className="text-lg font-mono text-gray-900">{fid}</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Transaction: {hash?.slice(0, 10)}...{hash?.slice(-8)}
              </p>
            </div>
            <button
              onClick={handleShare}
             className="nf_m w-48 h-10 px-6 py-3 bg-wrap-600 text-white rounded-full hover:bg-wrap-700 transition-colors"
            >
              Share on Farcaster
            </button>
            <div className="mt-4 text-white flex items-center justify-center">
              <a
                href={`/mint/${mintedTokenId}`}
                className="nf_m w-48 h-10  px-6 py-3 bg-wrap-600 text-white rounded-full hover:bg-wrap-700 active:bg-wrap-800 transition-all font-seminormal shadow-md hover:shadow-lg transform hover:-translate-y-0.5 touch-manipulation min-h-[44px] flex items-center justify-center"
              >
                View your NFT →
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6">
            {/* Single Art Preview - Full Screen */}
            {/* Only show canvas preview if user doesn't have NFT yet (no userNFT) */}
            {fid && !userNFT && !isSignedOut && (isSignedIn || isInMiniApp) && (
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
            {showSignInSuccess && (
              <div 
                className="w-full p-3 bg-green-50 border border-green-200 rounded-full transition-opacity duration-500 ease-in-out"
                style={{
                  opacity: isFadingOut ? 0 : 1,
                }}
              >
                <p className="text-sm text-green-700 text-center">
                  ✅ Signed in with Farcaster (FID: {fid})
                </p>
              </div>
            )}

            {/* User's NFT Display */}
            {fid && !isLoadingNFT && userNFT && !isSignedOut && (isSignedIn || isInMiniApp) && (
              <div className="w-full bg-white  p-4 ">
                <h3 className="space_d text-lg font-semibold mb-3 text-center text-gray-800">
                   Your NFT Collection
                </h3>
                <div className="flex flex-col items-center space-y-3">
                  {userNFT.tokenId ? (
                        <canvas
                          ref={userNFTCanvasRef}
                          width={600}
                          height={600}
                          className="w-full h-full object-contain"
                          style={{ imageRendering: 'auto' }}
                        /> 
                  ) : null}
                  {userNFT.tokenId && (
                    <>
                      <div className="text-center space_d">
                        {/* แสดงชื่อ NFT พร้อม source indicator */}
                        <p className="space_d text-sm font-semibold text-gray-700">
                        {userNFT.name 
                            ? userNFT.name // แสดงชื่อจาก metadata
                            : `Farcaster Abtract  #${userNFT.tokenId}`}
                        </p>
                        {/* แสดง source ของข้อมูล */}
                        {userNFT?.source && (
                          <p className="text-xs text-gray-400 mt-1">
                            {
                            //  userNFT.source === 'contract_tokenURI' ? '⛓️ Smart Contract' :
                            //  userNFT.source === 'pinata_ipfs' ? '📦 IPFS Backup' :
                           //   userNFT.source === 'fallback_tokenid_only' ? '🔄 Fallback Mode' :
                           //   '📋 Contract Data'
                            }
                          </p>
                        )}
                        <p className="text-xs text-gray-500">Token ID: {userNFT.tokenId}</p>
                      </div>
                     
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Loading state - show when fetching NFT data */}
            {fid && isLoadingNFT && !userNFT && !isSignedOut && (isSignedIn || isInMiniApp) && (
              <div className="w-full p-4 bg-gray-50 rounded-full">
                <p className="text-sm text-gray-600 text-center">Loading your NFT...</p>
              </div>
            )}

            {/* Show message if FID exists but no NFT found */}
            {fid && !isLoadingNFT && !userNFT && isAlreadyMinted === false && !isSignedOut && (isSignedIn || isInMiniApp) && (
              <div className="nf_m  w-full p-4 bg-blue-50 border border-blue-200 rounded-full">
                <p className="text-sm text-blue-700 text-center">
                  You haven&apos;t minted an NFT yet. Mint your first NFT below! 🎨
                </p>
              </div>
            )}
            
            {isAlreadyMinted === true && tokenIdError && (
              <div className="w-full space-y-2">
                <div className="p-3 bg-red-50 border border-red-200 rounded-full">
                  <p className="text-sm text-red-700 text-center">
                    ⚠️ {tokenIdError}
                  </p>
                  <p className="text-xs text-red-600 text-center mt-1">
                    TokenId is required to view your NFT. This value comes from the smart contract Mint event.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setTokenIdError(null);
                    setIsLoadingNFT(true);
                    // Reset hasFetched flag to allow retry
                    const fetchTokenId = async () => {
                      try {
                        const response = await fetch(`/api/nft-by-fid?fid=${encodeURIComponent(fid || "")}`);
                        if (response.ok) {
                          const data = await response.json();
                          // ✅ Accept tokenId = "0" (first NFT minted)
                          if (data.tokenId && data.tokenId !== "undefined" && data.tokenId !== "null" && /^\d+$/.test(String(data.tokenId))) {
                            // Verify from metadata
                            try {
                              const metadataResponse = await fetch(`/api/nft-metadata?tokenId=${encodeURIComponent(String(data.tokenId))}`);
                              if (metadataResponse.ok) {
                                const metadata = await metadataResponse.json();
                                let verifiedTokenId = String(data.tokenId);
                                if (metadata.name && typeof metadata.name === 'string') {
                                  const nameMatch = metadata.name.match(/#(\d+)$/);
                                  if (nameMatch && nameMatch[1]) {
                                    verifiedTokenId = nameMatch[1];
                                  }
                                }
                                setUserNFT({ 
                                  tokenId: verifiedTokenId,
                                  image: metadata.image,
                                  name: metadata.name,
                                });
                                setTokenIdError(null);
                              } else {
                                // Use tokenId from Mint event if metadata fails
                                setUserNFT({ tokenId: String(data.tokenId) });
                                setTokenIdError(null);
                              }
                            } catch (metadataError) {
                              // Use tokenId from Mint event if metadata verification fails
                              console.warn("Metadata verification failed, using Mint event tokenId:", metadataError);
                              setUserNFT({ tokenId: String(data.tokenId) });
                              setTokenIdError(null);
                            }
                          } else {
                            setTokenIdError("TokenId not found in response. Please try again.");
                          }
                        } else {
                          const errorData = await response.json().catch(() => ({}));
                          setTokenIdError(errorData.error || "Failed to fetch tokenId. Please try again.");
                        }
                      } catch (error) {
                        console.error("Retry error:", error);
                        setTokenIdError(error instanceof Error ? error.message : "Failed to fetch tokenId. Please try again.");
                      } finally {
                        setIsLoadingNFT(false);
                      }
                    };
                    fetchTokenId();
                  }}
                  className="block w-full px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-center font-semibold"
                >
                  🔄 Retry Fetching TokenId
                </button>
              </div>
            )}

            {/* Bottom Button - SIGN IN FARCASTER or MINT */}
            <div className="w-full">
              <div className="flex justify-center">
                {/* Show Sign In button only if:
                    - Not in miniapp AND (not signed in OR signed out)
                    - OR in miniapp but no FID and not signed in
                */}
                {((!isInMiniApp && (!isSignedIn || isSignedOut)) || (isInMiniApp && !fid && !isSignedIn)) ? (
                  // Show Sign In button if not in miniapp OR if in miniapp but no FID
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
                ) : (!isSignedOut && fid && (isSignedIn || isInMiniApp)) ? (
                  // Show Mint button if we have FID (from context or sign in) AND
                  // (signed in OR opened in miniapp)
                  // If minted successfully (mintedTokenId) or already minted (isAlreadyMinted), show View NFT button instead
                  (mintedTokenId || !!isAlreadyMinted) ? (
                    <div className="flex flex-col items-center gap-3">
                      {/* Show loading state if metadata is still loading */}
                      {isLoadingNFT || (!mintedTokenId && !userNFT?.tokenId) ? (
                        <div className="h-12 w-48 nf_m max-w-xs px-8 py-4 rounded-full bg-gray-400 text-white cursor-not-allowed font-sans text-lg font-semibold shadow-lg uppercase flex items-center justify-center">
                          Loading...
                        </div>
                      ) : (
                        <Link
                          href={`/mint/${mintedTokenId || userNFT?.tokenId || fid}`}
                          className="h-12 w-48 nf_m max-w-xs px-8 py-4 rounded-full transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl uppercase flex items-center justify-center"
                          style={{
                            backgroundColor: '#9333ea',
                            color: '#ffffff',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#7e22ce';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#9333ea';
                          }}
                        >
                          View NFT →
                        </Link>
                      )}
                      <Link
                        href="/gallery"
                        className="h-12 w-48 max-w-xs px-8 py-4 rounded-full transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl uppercase flex items-center justify-center"
                        style={{
                          backgroundColor: '#6366f1',
                          color: '#ffffff',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#4f46e5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#6366f1';
                        }}
                      >
                        View Gallery →
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={handleMint}
                      disabled={isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || !!isAlreadyMinted}
                      className="h-12 w-48  nf_m max-w-xs px-8 py-4 rounded-full disabled:cursor-not-allowed transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl uppercase"
                      style={{
                        backgroundColor: (isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || !!isAlreadyMinted) ? '#9ca3af' : '#9333ea',
                        color: '#ffffff',
                      }}
                      onMouseEnter={(e) => {
                        if (!(isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || !!isAlreadyMinted)) {
                          e.currentTarget.style.backgroundColor = '#7e22ce';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(isMinting || isPendingWrite || isConfirming || !fid || !imageBase64 || !!isAlreadyMinted)) {
                          e.currentTarget.style.backgroundColor = '#9333ea';
                        }
                      }}
                    >
                      {isMinting || isPendingWrite || isConfirming
                        ? "Minting..."
                        : "MINT"}
                    </button>
                  )
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
                
                // Don't show error if user rejected/cancelled - it's expected behavior
                if (isUserRejected(errorMessage)) {
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


