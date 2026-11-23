import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ANAGU! — Blockchain Land Administration",
  description:
    "Secure. Transparent. Trusted. Blockchain-GIS-NFT-Community Verification Oracle framework for land title registration and verification under Nigeria's Land Use Act.",
  keywords: ["land title", "blockchain", "Nigeria", "GIS", "NFT", "land registry"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Inter font — loaded as link tag, not CSS @import */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          background: "var(--bg-midnight)",
          color: "var(--text-primary)",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
        className="antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
