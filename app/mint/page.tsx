"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect } from "wagmi";
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

  // Call ready when page is loaded (following Farcaster docs)
  // https://miniapps.farcaster.xyz/docs/guides/loading
  // Wait for your app to be ready, then call sdk.actions.ready()
  // This is required to hide the splash screen and display your content
  useEffect(() => {
    const callReady = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error("Error calling sdk.actions.ready():", error);
      }
    };
    callReady();
  }, []);

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
        console.log("User signed in successfully:", verifyData.user);
      }
    } catch (error) {
      console.error("Sign In error:", error);
      if (error instanceof Error && error.name === "RejectedByUser") {
        alert("Sign in was cancelled by user");
      } else {
        alert(`Sign in failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

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

  // Handle successful mint
  useEffect(() => {
    if (isConfirmed && hash) {
      setIsMinting(false);
      // Extract token ID from transaction if possible
      // For now, we'll use a placeholder
      setMintedTokenId(hash);
    }
  }, [isConfirmed, hash]);


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

      console.log("Image uploaded to IPFS:", ipfsUrl);

      // Step 2: Mint NFT with IPFS hash or base64 (fallback)
      // Note: If your contract expects IPFS hash, use ipfsHash
      // If it expects base64, use imageBase64 (current implementation)
      // You may need to update your contract to accept IPFS hash instead
      const imageData = ipfsHash ? `ipfs://${ipfsHash}` : imageBase64;

      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "mintForFid",
        args: [address, BigInt(fid), imageData],
      });
    } catch (error) {
      console.error("Mint error:", error);
      alert(`Mint failed: ${error instanceof Error ? error.message : String(error)}`);
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

  useEffect(() => {
    if (!fid || isNaN(Number(fid))) return;

    // Generate 9 variations using FID + index as seed
    gridRefs.current.forEach((canvas, index) => {
      if (canvas) {
        try {
          const seed = Number(fid) + index;
          generateArt(canvas, { tokenId: seed.toString() });
          
          // Update imageBase64 when first canvas is ready
          if (index === 0) {
            const base64 = canvas.toDataURL("image/png");
            setImageBase64(base64);
          }
        } catch (error) {
          console.error(`Error generating art for grid ${index}:`, error);
        }
      }
    });
  }, [fid]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-100">
      <div className="w-full max-w-2xl">
        {/* Blue Icon */}
        <div className="flex justify-center mb-6">
          <Image 
            src="/blue-icon.png" 
            alt="NFT Icon" 
            width={96}
            height={96}
            className="object-contain"
          />
        </div>

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
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <p className="text-gray-600 mb-4">
              {isSignedIn ? "Signed in successfully!" : "Sign in with Farcaster to continue"}
            </p>
            {!isSignedIn && (
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSigningIn ? "Signing in..." : "Sign In with Farcaster"}
              </button>
            )}
            {isSignedIn && (
              <p className="text-sm text-green-600 mt-2">Waiting for FID...</p>
            )}
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
          <div className="bg-white p-8 rounded-lg shadow-lg">
            {/* Sign In Status */}
            {isSignedIn && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ Signed in with Farcaster (FID: {fid})
                </p>
              </div>
            )}

            {/* 3x3 Grid of Art Previews */}
            {fid && (
              <div className="mb-8">
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-gray-200 rounded overflow-hidden"
                    >
                      <canvas
                        ref={(el) => {
                          gridRefs.current[index] = el;
                        }}
                        width={200}
                        height={200}
                        className="w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sign In Button (if not signed in but have wallet) */}
            {!isSignedIn && fid && (
              <div className="mb-4 text-center">
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isSigningIn ? "Signing in..." : "🔐 Sign In with Farcaster"}
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  Optional: Sign in to verify your identity
                </p>
              </div>
            )}

            {/* MINT Button */}
            <div className="flex justify-center">
              <button
                onClick={handleMint}
                disabled={isMinting || isPendingWrite || isConfirming || !fid || !imageBase64}
                className="px-12 py-4 bg-purple-600 text-white rounded-full text-xl font-bold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                {isMinting || isPendingWrite || isConfirming
                  ? "Minting..."
                  : "MINT"}
              </button>
            </div>

            {(writeError || txError) && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">
                  Error: {writeError?.message || txError?.message}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

