import type { Metadata } from "next";
import Link from "next/link";

import LanguageSwitch from "@/components/LanguageSwitch";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raspi ImmortalWrt Docs",
  description: "ImmortalWrt documentation site with separated Chinese/English views"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="bg-layer" />
        <header className="site-header">
          <div className="container">
            <Link className="brand" href="/">
              Raspi-ImmortalWrt Docs
            </Link>
            <div className="header-actions">
              <LanguageSwitch />
              <a
                className="repo-link"
                href="https://github.com/Ronchy2000/Raspi-ImmortalWrt"
                target="_blank"
                rel="noreferrer noopener"
              >
                GitHub
              </a>
            </div>
          </div>
        </header>
        <main className="container main-content">{children}</main>
      </body>
    </html>
  );
}
