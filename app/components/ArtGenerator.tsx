"use client";

import { useEffect, useRef, useState } from "react";
import { generateArt } from "../../lib/p5-art-generator";

interface ArtGeneratorProps {
  tokenId: string;
  fid?: string; // FID to use as seed (takes priority over tokenId)
  onBase64Generated?: (base64: string) => void;
  width?: number;
  height?: number;
  showBase64?: boolean; // Whether to show base64 code (default: false)
}

export default function ArtGenerator({ 
  tokenId, 
  fid,
  onBase64Generated,
  width = 600,
  height = 600,
  showBase64 = false // Hide base64 code by default
}: ArtGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [base64, setBase64] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Use FID as seed if provided (matches contract generation), otherwise use tokenId
      // This ensures consistent art generation across view page, gallery, and API
      const seed = fid || tokenId;
      
      // Set canvas size before generating art
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      // Generate art on canvas
      generateArt(canvasRef.current, { tokenId: seed });
      
      // Convert to base64
      const base64String = canvasRef.current.toDataURL("image/png");
      setBase64(base64String);
      
      if (onBase64Generated) {
        onBase64Generated(base64String);
      }
    } catch (error) {
      console.error("Error generating art:", error);
    }
  }, [tokenId, fid, width, height, onBase64Generated]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ maxWidth: "100%", height: "auto" }}
      />
      {base64 && showBase64 && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Base64 generated successfully</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-blue-600">View Base64</summary>
            <textarea
              readOnly
              value={base64}
              className="mt-2 w-full h-32 p-2 text-xs font-mono border rounded"
            />
          </details>
        </div>
      )}
    </div>
  );
}

