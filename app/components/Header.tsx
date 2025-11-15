"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Header() {
  const router = useRouter();
  const [fid, setFid] = useState<string>("");
  const [farcasterUser, setFarcasterUser] = useState<{
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSignedOut, setIsSignedOut] = useState(false);

  // Check localStorage for signed in/out status on mount
  useEffect(() => {
    const signedOut = localStorage.getItem("farcaster_signed_out") === "true";
    const signedIn = localStorage.getItem("farcaster_signed_in") === "true";
    const storedFid = localStorage.getItem("farcaster_fid");
    
    if (signedOut) {
      setIsSignedOut(true);
    } else if (signedIn && storedFid) {
      // If signed in, use FID from localStorage
      setFid(storedFid);
    }
    // Note: If not signed in, we'll get FID from SDK context below
  }, []);

  // Listen for storage changes and custom events (when sign in happens in mint page)
  useEffect(() => {
    const handleStorageChange = () => {
      const signedIn = localStorage.getItem("farcaster_signed_in") === "true";
      const storedFid = localStorage.getItem("farcaster_fid");
      const signedOut = localStorage.getItem("farcaster_signed_out") === "true";
      
      console.log("[Header] Storage change detected:", { signedIn, storedFid, signedOut });
      
      if (signedOut) {
        setIsSignedOut(true);
        setFid("");
        setFarcasterUser(null);
      } else if (signedIn && storedFid) {
        setIsSignedOut(false);
        setFid(storedFid);
        console.log("[Header] Updated FID from localStorage:", storedFid);
      }
    };

    // Listen for storage events (cross-tab)
    window.addEventListener("storage", handleStorageChange);
    
    // Listen for custom event (same-tab updates)
    window.addEventListener("farcaster-signin", handleStorageChange);
    
    // Also check on interval for same-tab updates (fallback)
    const interval = setInterval(handleStorageChange, 300); // Reduced to 300ms for faster updates
    
    // Check immediately on mount
    handleStorageChange();
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("farcaster-signin", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Get FID from SDK context automatically (if not signed out and not already have FID from localStorage)
  useEffect(() => {
    // Don't fetch if user has signed out
    if (isSignedOut) {
      console.log("[Header] Skipping FID fetch: user signed out");
      return;
    }
    
    // Don't fetch if we already have FID (from localStorage or previous fetch)
    if (fid) {
      console.log("[Header] Skipping FID fetch: already have FID", fid);
      return;
    }

    // Check localStorage first (for signed in users)
    const storedFid = localStorage.getItem("farcaster_fid");
    const signedIn = localStorage.getItem("farcaster_signed_in") === "true";
    
    if (signedIn && storedFid) {
      console.log("[Header] Found FID from localStorage:", storedFid);
      setFid(storedFid);
      return;
    }

    // If not signed in, try to get FID from SDK context (for Mini App users)
    console.log("[Header] Attempting to get FID from SDK context...");
    const getContext = async () => {
      try {
        const inMini = await sdk.isInMiniApp();
        console.log("[Header] isInMiniApp:", inMini);
        
        if (!inMini) {
          console.log("[Header] Not in Mini App, skipping FID fetch");
          return;
        }

        const ctx = await sdk.context;
        console.log("[Header] SDK context:", ctx);
        
        if (ctx?.user?.fid) {
          const extractedFid = ctx.user.fid.toString();
          console.log("[Header] Found FID from context:", extractedFid);
          setFid(extractedFid);
        } else {
          console.log("[Header] No FID found in context");
        }
      } catch (error) {
        console.error("[Header] Error getting context:", error);
      }
    };

    getContext();
  }, [isSignedOut, fid]);

  // Get user data from SDK context or API when we have FID
  useEffect(() => {
    // Don't fetch if user has signed out
    if (isSignedOut) return;
    if (!fid) return;

    const getUserData = async () => {
      try {
        // Try to get user data from SDK context first
        const inMini = await sdk.isInMiniApp();
        if (inMini) {
          const ctx = await sdk.context;
          if (ctx?.user?.fid) {
            const contextUser = ctx.user;
            
            // Use user data directly from context (username, displayName, pfpUrl)
            // According to docs: https://miniapps.farcaster.xyz/docs/sdk/context#user
            if (contextUser) {
              setFarcasterUser({
                username: contextUser.username,
                displayName: contextUser.displayName,
                avatarUrl: contextUser.pfpUrl, // Map pfpUrl to avatarUrl for consistency
              });
            }
          }
        }
        
        // Fetch additional data from API (bio, followersCount, castsCount)
        fetch(`/api/farcaster-user?fid=${encodeURIComponent(fid)}`)
          .then((userRes) => userRes.ok ? userRes.json() : null)
          .then((userData) => {
            if (userData?.user) {
              // Merge API data with context data (API may have more complete info)
              setFarcasterUser((prev) => ({
                ...prev,
                ...userData.user,
                // Prefer context pfpUrl if available, otherwise use API avatarUrl
                avatarUrl: prev?.avatarUrl || userData.user.avatarUrl,
              }));
            }
          })
          .catch((err) => {
            console.warn("Error fetching additional Farcaster user data:", err);
          });
      } catch (error) {
        console.error("Error getting user data:", error);
      }
    };

    getUserData();
  }, [fid, isSignedOut]);

  const handleSignOut = () => {
    // Sign out: Clear all Farcaster-related state
    setFid("");
    setFarcasterUser(null);
    setShowUserMenu(false);
    setIsSignedOut(true);
    
    // Store sign out state in localStorage to persist across page refreshes
    localStorage.setItem("farcaster_signed_out", "true");
    localStorage.removeItem("farcaster_signed_in");
    localStorage.removeItem("farcaster_fid");
    
    // Dispatch custom event to notify mint page immediately
    window.dispatchEvent(new Event("farcaster-signout"));
    
    console.log("[Header] Sign out complete");
    
    // Redirect to mint page (sign in page)
    router.push("/mint");
  };

  // Debug: Log current state
  useEffect(() => {
    console.log("[Header] Current state:", { fid, isSignedOut, hasFarcasterUser: !!farcasterUser });
  }, [fid, isSignedOut, farcasterUser]);

  return (
    <>
      {/* Farcaster User Profile - Top Right (Show if we have FID and not signed out) */}
      {!isSignedOut && fid && (
        <div className="fixed top-4 right-4 z-50" style={{ paddingRight: '5px' }} >
          <div 
            className="flex items-center gap-3 bg-purple-600 rounded-full px-4 py-2 border border-wrap-700 cursor-pointer hover:bg-wrap-700 transition-colors shadow-lg"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {farcasterUser?.avatarUrl ? (
              <Image
                src={farcasterUser.avatarUrl}
                alt="User"
                width={32}
                height={32}
                className="rounded-full"
                unoptimized
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {fid.slice(-2)}
                </span>
              </div>
            )}
            <svg 
              className={`w-5 h-5 text-white transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              {/* Backdrop to close menu when clicking outside */}
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-38 h-8 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    className="w-38 h-8 text-left px-4 py-2.5 text-sm font-medium text-red-600 bg-pink-50 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

