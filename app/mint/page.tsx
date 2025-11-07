"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { minikitConfig } from "../../minikit.config";

// NFT Contract Address on Base
const NFT_CONTRACT_ADDRESS = "0xe81B2748149d089eBdaE6Fee36230D98BA00FF49" as const;

// ABI for mintForFid function
const NFT_ABI = [
  {
    name: "mintForFid",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "fid", type: "uint256" }
    ],
    outputs: []
  }
] as const;

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { composeCastAsync } = useComposeCast();
  const [fid, setFid] = useState<string>("");
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);

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

    setIsMinting(true);
    try {
      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: "mintForFid",
        args: [address, BigInt(fid)],
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
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Farcaster FID
              </label>
              <input
                type="text"
                value={fid}
                onChange={(e) => setFid(e.target.value)}
                placeholder="Enter your Farcaster FID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-2 text-sm text-gray-500">
                Your Farcaster FID is a unique number associated with your Farcaster account
              </p>
            </div>

            <button
              onClick={handleMint}
              disabled={isMinting || isPendingWrite || isConfirming || !fid}
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

