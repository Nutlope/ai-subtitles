import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import PlausibleProvider from "next-plausible";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.usesubstudio.com/"),
  title: "SubStudio",
  description:
    "The fastest way to caption your videos — powered by Together AI",
  icons: {
    icon: "/favicon-subtitle.svg",
  },
  openGraph: {
    title: "SubStudio",
    description:
      "The fastest way to caption your videos — powered by Together AI",
    images: [{ url: "/sub-studio-OG.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SubStudio",
    description:
      "The fastest way to caption your videos — powered by Together AI",
    images: ["/sub-studio-OG.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider domain="usesubstudio.com" />
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
