"use client";

import { useEffect, useState, useRef } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Generate art preview and base64
  useEffect(() => {
    if (!fid || isNaN(Number(fid))) return;
    
    // Use FID as tokenId for preview (will be actual tokenId after mint)
    const previewTokenId = fid;
    
    if (canvasRef.current) {
      try {
        generateArt(canvasRef.current, { tokenId: previewTokenId });
        const base64 = canvasRef.current.toDataURL("image/png");
        setImageBase64(base64);
      } catch (error) {
        console.error("Error generating preview:", error);
      }
    }
  }, [fid]);

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
      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: "mintForFid",
        args: [address, BigInt(fid), imageBase64],
      });
    } catch (error) {
      console.error("Mint error:", error);
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          Mint Your NFT
        </h1>

        {!isConnected ? (
          <div className="text-center p-8 bg-gray-100 rounded-lg">
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
        ) : mintedTokenId ? (
          <div className="text-center p-8 bg-green-50 rounded-lg">
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
            {/* Connected Wallet Info */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Connected Wallet:</p>
              <p className="text-sm font-mono text-gray-900 break-all">{address}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Farcaster FID
              </label>
              {fid ? (
                <div className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-900 font-mono">{fid}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    FID loaded from your Farcaster account
                  </p>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={fid}
                    onChange={(e) => setFid(e.target.value)}
                    placeholder="Enter your Farcaster FID (or wait for auto-load)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Your Farcaster FID will be loaded automatically, or enter it manually
                  </p>
                </>
              )}
            </div>

            {/* Art Preview */}
            {fid && imageBase64 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">NFT Preview:</p>
                <div className="flex justify-center">
                  <canvas
                    ref={canvasRef}
                    width={300}
                    height={300}
                    className="border border-gray-300 rounded-lg"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  This art will be minted with your NFT
                </p>
              </div>
            )}

            <button
              onClick={handleMint}
              disabled={isMinting || isPendingWrite || isConfirming || !fid || !imageBase64}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isMinting || isPendingWrite || isConfirming
                ? "Minting..."
                : "Mint NFT"}
            </button>

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

