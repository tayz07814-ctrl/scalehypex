import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { ThemeProvider } from "next-themes";
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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/icon.svg"],
  },
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
          background: "var(--orb-1)",
        }}
      />
      <div
        className="orb animate-aurora-slow"
        style={{
          top: "6%",
          right: "-12%",
          width: "38rem",
          height: "38rem",
          background: "var(--orb-2)",
        }}
      />
      <div
        className="orb animate-aurora"
        style={{
          bottom: "-20%",
          left: "20%",
          width: "42rem",
          height: "42rem",
          background: "var(--orb-3)",
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
      suppressHydrationWarning
      className={`${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          themes={["light", "dark", "neo"]}
          enableSystem={false}
        >
          <AuroraBackground />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
