import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CarbonWise - AI Carbon Intelligence",
  description:
    "Track, understand, and reduce your carbon footprint with personalized AI insights and a living digital garden.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-gradient-to-b from-green-50 to-white`}
      >
        {children}
      </body>
    </html>
  );
}
