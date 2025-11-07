"use client";

import ArtGenerator from "../../components/ArtGenerator";
import { minikitConfig } from "../../../minikit.config";

export default function NFTViewClient({ tokenId }: { tokenId: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">
          NFT #{tokenId}
        </h1>
        <p className="text-gray-600 mb-8">
          This NFT was minted on {minikitConfig.miniapp.name}
        </p>

        <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
          <div className="flex justify-center mb-4">
            <ArtGenerator tokenId={tokenId} />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-semibold mb-2">Token ID: {tokenId}</h2>
            <p className="text-gray-600 mb-4">
              Share this page to show off your NFT in Farcaster feeds!
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Tip: When you share this URL in a Farcaster cast, it will appear as a rich embed
                with a button to view the NFT directly in the app.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <a
            href="/mint"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Mint Another NFT
          </a>
        </div>
      </div>
    </main>
  );
}

