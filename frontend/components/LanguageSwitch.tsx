"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LOCALE_PREFERENCE_KEY } from "@/lib/locale";

export default function LanguageSwitch() {
  const pathname = usePathname();
  const isEnglish = pathname === "/en" || pathname.startsWith("/en/");

  const rememberLocale = (locale: "zh" | "en") => {
    try {
      localStorage.setItem(LOCALE_PREFERENCE_KEY, locale);
    } catch {
      // Ignore storage failures.
    }
  };

  return (
    <nav className="lang-nav" aria-label="Language">
      <Link href="/" className={!isEnglish ? "active" : undefined} onClick={() => rememberLocale("zh")}>
        中文
      </Link>
      <span>/</span>
      <Link href="/en/" className={isEnglish ? "active" : undefined} onClick={() => rememberLocale("en")}>
        English
      </Link>
    </nav>
  );
}
