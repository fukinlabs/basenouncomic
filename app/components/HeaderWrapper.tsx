'use client';

import { useState, useEffect } from "react";
import Header from "./Header";

// Wrapper to conditionally load Header (optimize root page loading)
export default function HeaderWrapper() {
  const [shouldShowHeader, setShouldShowHeader] = useState(false);

  useEffect(() => {
    // Show header after a short delay to not block initial page load
    const timer = setTimeout(() => {
      setShouldShowHeader(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Don't show header on root page during initial load
  if (typeof window !== 'undefined' && window.location.pathname === '/' && !shouldShowHeader) {
    return null;
  }

  return <Header />;
}
