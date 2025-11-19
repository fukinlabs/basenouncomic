"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { sdk } from "@farcaster/miniapp-sdk";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const { isFrameReady, setFrameReady } = useMiniKit();

  // Redirect to /mint page (homeUrl in minikit.config.ts)
  // Following Farcaster docs: https://miniapps.farcaster.xyz/docs/guides/loading
  useEffect(() => {
    const redirectToMint = async () => {
      try {
        // Check if running in Farcaster miniapp (for logging/debugging)
        await sdk.isInMiniApp();
        
        // Call ready when interface is ready to be displayed
        if (!isFrameReady) {
          // Wait for next tick to ensure DOM is fully rendered
          // This prevents jitter and content reflows as recommended in the docs
          setTimeout(() => {
            setFrameReady();
          }, 0);
        }

        // Redirect to /mint page (matches homeUrl in minikit.config.ts)
        // Small delay to ensure ready() is called first
        setTimeout(() => {
          router.push("/mint");
        }, 100);
      } catch (error) {
        console.error("Error checking miniapp or redirecting:", error);
        // Fallback: redirect anyway
        setTimeout(() => {
          router.push("/mint");
        }, 100);
      }
    };

    redirectToMint();
  }, [router, setFrameReady, isFrameReady]);

  // Show loading screen while redirecting
  // Following Farcaster docs: https://miniapps.farcaster.xyz/docs/guides/loading
  // "Use placeholders and skeleton states if additional loading is required"
  return (
    <div className={styles.container}>
      <div className={styles.loadingScreen}>
        <div className={styles.loader}></div>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    </div>
  );
}
