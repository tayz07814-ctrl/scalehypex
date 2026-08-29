import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ScaleHypex — Post once, everywhere",
    template: "%s — ScaleHypex",
  },
  description:
    "Auto-detects your new TikToks, downloads them watermark-free, and publishes them to Instagram Reels and Facebook — with a comment auto-reply bot.",
};

function AuroraBackground() {
  return (
    <div aria-hidden className="aurora">
      <div
        className="orb animate-aurora"
        style={{
          top: "-14%",
          left: "-8%",
          width: "44rem",
          height: "44rem",
          background: "rgb(124 58 237 / 0.55)",
        }}
      />
      <div
        className="orb animate-aurora-slow"
        style={{
          top: "6%",
          right: "-12%",
          width: "38rem",
          height: "38rem",
          background: "rgb(217 70 239 / 0.42)",
        }}
      />
      <div
        className="orb animate-aurora"
        style={{
          bottom: "-20%",
          left: "20%",
          width: "42rem",
          height: "42rem",
          background: "rgb(34 211 238 / 0.3)",
          animationDelay: "-9s",
        }}
      />
      <div className="bg-grid absolute inset-0" />
    </div>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuroraBackground />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
