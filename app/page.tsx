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
    <main className="relative min-h-screen w-full flex flex-col">
      {/* Background Image - Full Screen */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/blue-hero.png)',
        }}
      />
      
      {/* Overlay for better button visibility (optional) */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Content - Button at bottom */}
      <div className="relative flex-1 flex items-end justify-center pb-8 px-4 z-10">
        <Link
          href="/mint"
          className="w-full max-w-xs px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-sans text-lg font-semibold shadow-lg hover:shadow-xl text-center"
        >
          🎨 Mint NFT
        </Link>
      </div>
    </main>
  );
}

