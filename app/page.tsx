"use client";
import { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import styles from "./page.module.css";

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();

  // Call ready when interface is ready to be displayed
  // Following Farcaster docs: https://miniapps.farcaster.xyz/docs/guides/loading
  // Key points:
  // - "Call ready when your interface is ready to be displayed"
  // - "You should call ready as soon as possible while avoiding jitter and content reflows"
  // - "Don't call ready until your interface has loaded"
  // - "Use placeholders and skeleton states if additional loading is required"
  useEffect(() => {
    if (!isFrameReady) {
      // Wait for next tick to ensure DOM is fully rendered
      // This prevents jitter and content reflows as recommended in the docs
      const timer = setTimeout(() => {
        setFrameReady();
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [setFrameReady, isFrameReady]);

  // Show loading screen
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
