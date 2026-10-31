import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import localFont from "next/font/local";
import { getSettings } from "@/lib/catalog";
import { env } from "@/lib/env";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

/**
 * Jost's digits (0–9 only), placed ahead of Cormorant in the display stack so headings
 * keep the serif letters but show plain lining numerals. Scaled to Cormorant's cap height.
 */
const numerals = localFont({
  src: "./fonts/jost-latin.woff2",
  variable: "--font-numerals",
  weight: "300 600",
  display: "swap",
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0030-0039" },
    { prop: "size-adjust", value: "89%" },
  ],
});

export async function generateMetadata(): Promise<Metadata> {
  const { storeName, tagline } = await getSettings();
  const description = tagline
    ? `${tagline}. Shop luxury, embroidered, printed and ready-to-wear Pakistani suits online.`
    : "Shop luxury, embroidered, printed and ready-to-wear Pakistani women's suits online.";
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: `${storeName} | Pakistani Women's Clothing`, template: `%s | ${storeName}` },
    description,
    applicationName: storeName,
    openGraph: { siteName: storeName, locale: "en_PK", type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: browser extensions add attributes to <html>/<body> before React
    // hydrates (e.g. "crxlauncher"). It only affects these two tags' own attributes.
    <html lang="en" className={`${cormorant.variable} ${jost.variable} ${numerals.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh" suppressHydrationWarning>{children}</body>
    </html>
  );
}
