"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

const NETWORK =
  (process.env.NEXT_PUBLIC_APTOS_NETWORK as Network) ?? Network.TESTNET;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: NETWORK,
        aptosApiKeys: {
          [Network.TESTNET]: process.env.NEXT_PUBLIC_APTOS_API_KEY ?? "",
        },
      }}
      onError={(error) => {
        console.error("Wallet error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}