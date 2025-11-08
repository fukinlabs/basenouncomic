"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/miniapp-sdk";

// AuthResponse interface can be added when integrating auth

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Load background image and mark as ready when loaded
  useEffect(() => {
    const img = new Image();
    
    // Set timeout to prevent infinite loading (max 3 seconds)
    const timeoutId = setTimeout(() => {
      setIsImageLoaded(true);
    }, 3000);
    
    img.src = "/monkey.gif";
    img.onload = () => {
      clearTimeout(timeoutId);
      setIsImageLoaded(true);
    };
    img.onerror = () => {
      clearTimeout(timeoutId);
      // Even if image fails, mark as loaded to show interface
      setIsImageLoaded(true);
    };
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Get Mini App context (following Farcaster SDK Context docs)
  // https://miniapps.farcaster.xyz/docs/sdk/context#open-mini-app
  useEffect(() => {
    const getContext = async () => {
      try {
        const ctx = await sdk.context;
        
        // Log context for debugging
        console.log("Mini App Context:", ctx);
        
        // Check if opened from another Mini App
        if (ctx.location?.type === "open_miniapp") {
          console.log("Opened from Mini App:", ctx.location.referrerDomain);
          // You can use referrerDomain for:
          // - Tracking referrals and attribution
          // - Customizing the experience based on the referring app
          // - Building app-to-app workflows
        }
        
        // Check user info
        if (ctx.user) {
          console.log("User FID:", ctx.user.fid);
          console.log("Username:", ctx.user.username);
        }
        
        // Check client info
        if (ctx.client) {
          console.log("Platform:", ctx.client.platformType);
          console.log("Added to client:", ctx.client.added);
        }
      } catch (error) {
        console.error("Error getting context:", error);
      }
    };
    
    getContext();
  }, []);

  // Call ready when interface is fully loaded (following Farcaster docs)
  // https://miniapps.farcaster.xyz/docs/guides/loading
  useEffect(() => {
    // Only call ready when:
    // 1. Image has loaded (or failed to load or timeout)
    // 2. Frame is not already ready
    // This prevents jitter and content reflow
    if (isImageLoaded && !isFrameReady) {
      setFrameReady();
    }
  }, [isImageLoaded, isFrameReady, setFrameReady]);
   
  // Auth can be integrated here later if needed

  return (
    <main 
      className="relative min-h-screen w-full flex flex-col"
      style={{ backgroundColor: "#2f3057" }}
    >
      {/* Background GIF - Full Screen */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/monkey.gif)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Overlay for better button visibility (optional) */}
      <div className="absolute inset-0 bg-[#2f3057]/30" />
      
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

