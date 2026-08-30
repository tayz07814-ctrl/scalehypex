import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
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
          background: "rgb(255 226 154 / 0.25)",
        }}
      />
      <div
        className="orb animate-aurora-slow"
        style={{
          top: "6%",
          right: "-12%",
          width: "38rem",
          height: "38rem",
          background: "rgb(255 199 216 / 0.25)",
        }}
      />
      <div
        className="orb animate-aurora"
        style={{
          bottom: "-20%",
          left: "20%",
          width: "42rem",
          height: "42rem",
          background: "rgb(220 201 255 / 0.22)",
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
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuroraBackground />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
