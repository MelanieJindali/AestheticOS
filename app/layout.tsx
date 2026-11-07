import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";

export const metadata: Metadata = {
  title: { default: "Aesthetic OS", template: "%s · Aesthetic OS" },
  description: "A calm, secure business operating system for health & beauty solopreneurs.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Aesthetic OS", statusBarStyle: "default" },
  robots: { index: true, follow: true },
  referrer: "strict-origin-when-cross-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf6f3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-surface px-4 py-2 rounded-full">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
