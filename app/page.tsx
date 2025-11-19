"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();

  // Redirect to /mint page (homeUrl in minikit.config.ts)
  // Following Farcaster docs: https://miniapps.farcaster.xyz/docs/getting-started#making-your-app-display
  // Important: Must call sdk.actions.ready() to hide splash screen
  useEffect(() => {
    const redirectToMint = async () => {
      try {
        // Check if running in Farcaster miniapp
        const inMini = await sdk.isInMiniApp();
        
        if (inMini) {
          // Call ready() immediately when interface is ready to be displayed
          // This is required to hide the splash screen
          // Following: https://miniapps.farcaster.xyz/docs/getting-started#making-your-app-display
          await sdk.actions.ready();
          console.log("[Root] Called sdk.actions.ready()");
        }

        // Redirect to /mint page (matches homeUrl in minikit.config.ts)
        // Small delay to ensure ready() is called first
        setTimeout(() => {
          router.push("/mint");
        }, 100);
      } catch (error) {
        console.error("[Root] Error checking miniapp or calling ready():", error);
        // Fallback: try to call ready() anyway, then redirect
        try {
          await sdk.actions.ready();
        } catch (readyError) {
          console.error("[Root] Error calling ready():", readyError);
        }
        setTimeout(() => {
          router.push("/mint");
        }, 100);
      }
    };

    redirectToMint();
  }, [router]);

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
