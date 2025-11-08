"use client";
import { ReactNode, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
import { config } from "../lib/wagmi.config";

/**
 * RootProvider configures Wagmi and OnchainKit for the app.
 * 
 * Uses the Farcaster Mini App Wagmi connector (@farcaster/miniapp-wagmi-connector)
 * as configured in lib/wagmi.config.ts following the Farcaster Mini Apps Wallet Guide:
 * https://miniapps.farcaster.xyz/docs/guides/wallets
 * 
 * The connector allows the app to interact with the user's EVM wallet
 * without needing wallet selection dialogs - the Farcaster client
 * handles wallet connection automatically.
 */
export function RootProvider({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={config.chains[0]}
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
      </QueryClientProvider>
    </WagmiProvider>
  );
}
