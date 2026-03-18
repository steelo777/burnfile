import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Burnfile — Self-Destructing File Vault", template: "%s | Burnfile" },
  description: "Upload any file with a maximum read count. When the limit is hit, access is permanently revoked — enforced by smart contract, not a server you have to trust.",
  openGraph: {
    title: "Burnfile — Self-Destructing File Vault",
    description: "Files that destroy themselves after N reads. Enforced on-chain.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0F14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg-primary text-text-primary`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
