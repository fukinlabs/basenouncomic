"use client";
import { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
"use client";
import { useState, useEffect } from "react";
import { useQuickAuth,useMiniKit } from "@coinbase/onchainkit/minikit";
import { useRouter } from "next/navigation";
import { minikitConfig } from "../minikit.config";
import styles from "./page.module.css";

interface AuthResponse {
  success: boolean;
  user?: {
    fid: number; // FID is the unique identifier for the user
    issuedAt?: number;
    expiresAt?: number;
  };
  message?: string; // Error messages come as 'message' not 'error'
}


export default function Home() {
  const { isFrameReady, setFrameReady, context } = useMiniKit();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // Initialize the  miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);
 
  

  // If you need to verify the user's identity, you can use the useQuickAuth hook.
  // This hook will verify the user's signature and return the user's FID. You can update
  // this to meet your needs. See the /app/api/auth/route.ts file for more details.
  // Note: If you don't need to verify the user's identity, you can get their FID and other user data
  // via `context.user.fid`.
  // const { data, isLoading, error } = useQuickAuth<{
  //   userFid: string;
  // }>("/api/auth");

  const { data: authData, isLoading: isAuthLoading, error: authError } = useQuickAuth<AuthResponse>(
    "/api/auth",
    { method: "GET" }
  );

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Check authentication first
    if (isAuthLoading) {
      setError("Please wait while we verify your identity...");
      return;
    }

    if (authError || !authData?.success) {
      setError("Please authenticate to join the waitlist");
      return;
    }

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // TODO: Save email to database/API with user FID
    console.log("Valid email submitted:", email);
    console.log("User authenticated:", authData.user);
    
    // Navigate to success page
    router.push("/success");
  };

  return (
    <div className={styles.container}>
      <button className={styles.closeButton} type="button">
        ✕
      </button>
      
      <div className={styles.content}>
        <div className={styles.waitlistForm}>
          <h1 className={styles.title}>Join {minikitConfig.miniapp.name.toUpperCase()}</h1>
          
          <p className={styles.subtitle}>
             Hey {context?.user?.displayName || "there"}, Get early access and be the first to experience the future of<br />
            crypto marketing strategy.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="email"
              placeholder="Your amazing email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.emailInput}
            />
            
            {error && <p className={styles.error}>{error}</p>}
            
            <button type="submit" className={styles.joinButton}>
              JOIN WAITLIST
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

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
