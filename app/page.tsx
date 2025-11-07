"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

// AuthResponse interface can be added when integrating auth

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);
   
  // Auth can be integrated here later if needed

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Blad Gamet
        </h1>
        <p className="text-center text-gray-600 mb-8">
          A Next.js application with Web3 and Farcaster integration
        </p>
        <div className="text-center">
          <Link
            href="/mint"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-sans"
          >
            🎨 Mint NFT
          </Link>
        </div>
      </div>
    </main>
  );
}

