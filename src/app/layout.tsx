import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, VT323 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Footer from "@/components/Footer";
import AppTooltip from "@/components/AppTooltip";
import Image from "next/image";
import Link from "next/link";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

const vt323 = VT323({
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-vt-323",
});

export const metadata: Metadata = {
  title: "4byte.sourcify.dev - Sourcify Ethereum Signature Database",
  description: "Search and lookup Ethereum function and event signatures from Sourcify",
  keywords: ["Ethereum", "Smart Contracts", "Sourcify", "Blockchain", "Solidity", "4byte", "Signatures"],
  authors: [{ name: "Sourcify" }],
  openGraph: {
    title: "4byte.sourcify.dev",
    description: "Search and lookup Ethereum function and event signatures from Sourcify",
    url: "https://4byte.sourcify.dev",
    siteName: "4byte.sourcify.dev",
    images: [
      {
        url: "https://4byte.sourcify.dev/sourcify-eth-card.png",
        width: 1200,
        height: 630,
        alt: "Sourcify Signature Database",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "4byte.sourcify.dev",
    description: "Search and lookup Ethereum function and event signatures from Sourcify",
    images: ["https://sourcify.dev/sourcify-logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={``}>
      <body
        className={`bg-gray-100 min-h-screen flex flex-col font-sans ${ibmPlexSans.variable} ${ibmPlexMono.variable} ${vt323.variable}`}
      >
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
        <header className="shadow-sm">
          <div className="mx-auto py-4 flex items-center w-full max-w-[100rem] px-6 md:px-12 lg:px-12 xl:px-24">
            <Link href="/" className="flex items-center">
              <Image src="/sourcify.png" alt="Sourcify Logo" className="h-10 w-auto mr-3" width={32} height={32} />
              <span className="text-gray-700 font-vt323 text-2xl">sourcify.eth</span>
            </Link>
          </div>
        </header>
        <main className="w-full max-w-[100rem] mx-auto px-6 md:px-12 lg:px-12 xl:px-24 py-6 flex-grow">{children}</main>
        <Footer />
        <AppTooltip />
      </body>
    </html>
  );
}
