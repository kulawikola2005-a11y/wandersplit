import type { Metadata } from "next";
import MobileFrame from "@/components/MobileFrame";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WanderSplit",
  description: "Plan, budżet, mapa i podział kosztów w podróży.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased ws-pirates`}
      >
        <MobileFrame>{children}</MobileFrame>
      </body>
    </html>
  );
}
