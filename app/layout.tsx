"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LargeKnowledgeGraph from "../components/LargeKnowledgeGraph";
import ThemeToggle from "../components/ThemeToggle";
import WikiHeadingsLinks from "../components/WikiHeadingsLinks";
import WikiNav from "../components/WikiNav";
import { useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [navOpen, setNavOpen] = useState(true);

  // Determine grid columns for wiki-layout based on navOpen
  const gridColumns = navOpen ? "260px 1fr 340px" : "0 1fr 340px";

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="wiki-layout" style={{ gridTemplateColumns: gridColumns }}>
          <WikiNav navOpen={navOpen} setNavOpen={setNavOpen} ThemeToggle={ThemeToggle} />
          <main className="wiki-main">{children}</main>
          <aside className="wiki-graph">
            <LargeKnowledgeGraph />
            <div className="wiki-related">
              <WikiHeadingsLinks />
            </div>
          </aside>
        </div>
      </body>
    </html>
  );
}
