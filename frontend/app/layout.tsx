import type { Metadata } from "next";
import { Cursor } from "@/components/system/Cursor";
import "./globals.css";

export const metadata: Metadata = {
  title: "SATQUERY — Mission Console",
  description:
    "Query and monitor the planet's surface over time via satellite imagery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <Cursor />
        {children}
      </body>
    </html>
  );
}
