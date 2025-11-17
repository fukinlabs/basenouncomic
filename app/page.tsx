"use client";
import { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();
  const router = useRouter();

  // Call ready() immediately and redirect - NO LOADING SCREEN
  useEffect(() => {
    console.log("========================================");
    console.log("[TEST] 🚀 Starting MiniApp initialization...");
    console.log("[TEST] Platform:", typeof navigator !== 'undefined' ? navigator.platform : 'unknown');
    console.log("[TEST] User Agent:", typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown');
    console.log("[TEST] isFrameReady:", isFrameReady);
    console.log("[TEST] SDK available:", typeof sdk !== 'undefined');
    console.log("[TEST] SDK actions available:", typeof sdk?.actions !== 'undefined');
    console.log("========================================");

    // Initialize OnchainKit frame ready
    if (!isFrameReady) {
      console.log("[TEST] 📦 Calling setFrameReady()...");
      setFrameReady();
    }

    // Call Farcaster SDK ready() with detailed logging
    const callReady = async () => {
      try {
        console.log("[TEST] 📞 Attempting sdk.actions.ready({ disableNativeGestures: true })...");
        const startTime = Date.now();
        
        await sdk.actions.ready({ disableNativeGestures: true });
        
        const endTime = Date.now();
        console.log("[TEST] ✅✅✅ ready() SUCCESS! (took", endTime - startTime, "ms)");
        console.log("[TEST] Redirecting to /mint...");
        
        // Redirect immediately
        router.push("/mint");
      } catch (error) {
        console.error("[TEST] ❌ ready() with disableNativeGestures FAILED:", error);
        console.error("[TEST] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined
        });
        
        // Fallback: try without disableNativeGestures
        try {
          console.log("[TEST] 🔄 Fallback: Trying sdk.actions.ready() without options...");
          const startTime = Date.now();
          
          await sdk.actions.ready();
          
          const endTime = Date.now();
          console.log("[TEST] ✅ ready() without options SUCCESS! (took", endTime - startTime, "ms)");
          console.log("[TEST] Redirecting to /mint...");
          
          router.push("/mint");
        } catch (fallbackError) {
          console.error("[TEST] ❌❌❌ Fallback ready() also FAILED:", fallbackError);
          console.error("[TEST] Error details:", {
            message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            stack: fallbackError instanceof Error ? fallbackError.stack : undefined,
            name: fallbackError instanceof Error ? fallbackError.name : undefined
          });
          console.log("[TEST] ⚠️ Redirecting anyway after 500ms...");
          
          setTimeout(() => {
            router.push("/mint");
          }, 500);
        }
      }
    };

    // Call ready immediately
    callReady();
  }, [isFrameReady, setFrameReady, router]);

  // Emergency fallback: redirect after 2 seconds
  useEffect(() => {
    const emergencyTimer = setTimeout(() => {
      console.log("[TEST] 🚨 EMERGENCY: Force redirect after 2s (ready() may have failed silently)");
      router.push("/mint");
    }, 2000);

    return () => clearTimeout(emergencyTimer);
  }, [router]);

  // NO UI - Just redirect immediately
  return null;
}
