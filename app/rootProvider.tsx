"use client";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";

/**
 * RootProvider configures Wagmi and OnchainKit for the app.
 * 
 * OnchainKit automatically configures the Farcaster Mini App Wagmi connector
 * (@farcaster/miniapp-wagmi-connector) when miniKit.enabled is true.
 * 
 * This follows the Farcaster Mini Apps Wallet Guide:
 * https://miniapps.farcaster.xyz/docs/guides/wallets
 * 
 * The connector allows the app to interact with the user's EVM wallet
 * without needing wallet selection dialogs - the Farcaster client
 * handles wallet connection automatically.
 */
export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
        notificationProxyUrl: undefined,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
