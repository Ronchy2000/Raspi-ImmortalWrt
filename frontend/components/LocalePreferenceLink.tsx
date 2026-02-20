"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { LOCALE_PREFERENCE_KEY, PreferredLocale } from "@/lib/locale";

type LocalePreferenceLinkProps = {
  href: string;
  locale: PreferredLocale;
  className?: string;
  children: ReactNode;
};

export default function LocalePreferenceLink({
  href,
  locale,
  className,
  children
}: LocalePreferenceLinkProps) {
  const rememberLocale = () => {
    try {
      localStorage.setItem(LOCALE_PREFERENCE_KEY, locale);
    } catch {
      // Ignore storage failures.
    }
  };

  return (
    <Link href={href} className={className} onClick={rememberLocale}>
      {children}
    </Link>
  );
}

