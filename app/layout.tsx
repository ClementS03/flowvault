import { ReactNode } from "react";
import { Space_Grotesk, Inter } from "next/font/google";
import { Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { getSEOTags } from "@/libs/seo";
import ClientLayout from "@/components/LayoutClient";
import ClipboardBridge from "@/components/ClipboardBridge";
import config from "@/config";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: config.colors.main,
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  ...getSEOTags(),
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body>
        <ClientLayout>{children}</ClientLayout>
        <ClipboardBridge />
        <Analytics />
      </body>
    </html>
  );
}
