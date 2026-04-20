import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "DOM Defender — Patch the Web",
  description:
    "Defend the DOM from CSS bugs, console errors, and memory leaks before the server crash meter hits 100%.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
