'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from './components/Navbar';
// 1. Import modules.
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, deserialize, serialize, createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

// 2. Create a new Query Client with a default `gcTime`.
const queryClient = new QueryClient()

const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [

    coinbaseWallet({
      appName: 'onchainkit',
    }),
  ],
  ssr: true,
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <Navbar />
            <main className="min-h-screen bg-gray-50">
              {children}
            </main>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
