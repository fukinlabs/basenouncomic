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
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="w-full max-w-5xl items-center justify-between font-mono text-sm">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <img
            src="/blue-icon.png"
            alt="Basenouncomic Logo"
            className="w-24 h-24 object-contain"
          />
        </div>
        
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">
          Welcome to Basenouncomic
        </h1>
        <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          A Next.js application with Web3 and Farcaster integration. Mint your unique NFT with generative art!
        </p>
        <div className="text-center">
          <Link
            href="/mint"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl"
          >
            🎨 Mint NFT
          </Link>
        </div>
      </div>
    </main>
  );
}

