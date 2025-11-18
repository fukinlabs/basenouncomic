"use client";
import { useEffect, useState } from "react";
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
  const [hasCalledReady, setHasCalledReady] = useState(false);

  // PRIORITY 1: Call SDK ready() with AGGRESSIVE fallbacks for preview dapp
  useEffect(() => {
    if (!hasCalledReady) {
      setHasCalledReady(true);
      
      // Detect environment
      const isFarcasterApp = window.parent !== window || 
                            navigator.userAgent.includes('Farcaster') || 
                            navigator.userAgent.includes('farcaster');
      
      // Redirect function with multiple fallbacks
      const redirect = () => {
        try {
          window.location.replace("/mint");
        } catch {
          try {
            window.location.href = "/mint";
          } catch {
            window.location.assign("/mint");
          }
        }
      };
      
      if (isFarcasterApp) {
        // Farcaster app: Call SDK ready with AGGRESSIVE timeout and multiple fallbacks
        
        // FALLBACK 1: Immediate redirect after 500ms (for preview dapp that hangs)
        const immediateFallback = setTimeout(() => {
          redirect();
        }, 500);
        
        // FALLBACK 2: Fast redirect after 1 second
        const fastFallback = setTimeout(() => {
          redirect();
        }, 1000);
        
        // FALLBACK 3: Absolute fallback after 2 seconds
        const absoluteFallback = setTimeout(() => {
          redirect();
        }, 2000);
        
        const callReady = async () => {
          try {
            // Very short timeout for preview dapp (300ms)
            const readyPromise = sdk.actions.ready();
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("ready() timeout")), 300);
            });
            
            await Promise.race([readyPromise, timeoutPromise]);
            
            // SDK ready succeeded - clear all fallbacks and redirect
            clearTimeout(immediateFallback);
            clearTimeout(fastFallback);
            clearTimeout(absoluteFallback);
            redirect();
            
          } catch {
            // SDK ready failed - fallbacks will handle redirect
            // Don't clear fallbacks - let them fire
          }
        };
        
        // Start SDK ready call (non-blocking)
        callReady();
        
        return () => {
          clearTimeout(immediateFallback);
          clearTimeout(fastFallback);
          clearTimeout(absoluteFallback);
        };
        
      } else {
        // Browser: redirect immediately (no SDK needed)
        redirect();
      }
    }
  }, [hasCalledReady]);

  // PRIORITY 2: Background tasks (don't block ready())
  useEffect(() => {
    // Preload image in background
    const img = new Image();
    img.src = "/monkey.gif";
  }, []);
   
  // Auth can be integrated here later if needed

  return (
    <main 
      className="relative min-h-screen w-full flex flex-col items-center justify-center"
      style={{ backgroundColor: "#2f3057" }}
    >
      {/* Background GIF - Full Screen */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/monkey.gif)',
         backgroundSize: '60%',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Overlay for better button visibility */}
      <div className="absolute inset-0 bg-[#2f3057]/30" />
      
       {/* Loading Indicator */}
       <div className="relative z-10 text-center max-w-md mx-auto px-4">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
         <p className="text-white text-lg font-medium mb-2">Loading...</p>
         <p className="text-white/70 text-sm mb-4">Please wait...</p>
       </div>
      
    </main>
  );
}

