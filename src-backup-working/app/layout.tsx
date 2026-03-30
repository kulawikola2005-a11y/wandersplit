import "./globals.css";
import type { Metadata } from "next";
import MobileFrame from "@/components/MobileFrame";

export const metadata: Metadata = {
  title: "WanderSplit",
  description: "Planowanie podróży i budżetu grupowego",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>
        <div className="min-h-dvh bg-[#020617] px-3 py-4">
          <MobileFrame>{children}</MobileFrame>
        </div>
      </body>
    </html>
  );
}
