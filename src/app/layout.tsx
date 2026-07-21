import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WanderSplit",
  description: "Travel planner and group budget app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>
        <div className="app-shell">
          <div className="app-screen">{children}</div>
        </div>
      </body>
    </html>
  );
}
