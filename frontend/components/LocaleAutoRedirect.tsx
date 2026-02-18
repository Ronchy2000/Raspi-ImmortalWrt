"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LOCALE_PREFERENCE_KEY, PreferredLocale } from "@/lib/locale";

function detectBrowserLocale(): PreferredLocale {
  if (typeof navigator === "undefined") return "zh";
  const preferredList = [navigator.language, ...(navigator.languages ?? [])]
    .filter(Boolean)
    .map((item) => item.toLowerCase());
  return preferredList.some((item) => item.startsWith("zh")) ? "zh" : "en";
}

export default function LocaleAutoRedirect() {
  const router = useRouter();

  useEffect(() => {
    let preferred: PreferredLocale | null = null;

    try {
      const saved = localStorage.getItem(LOCALE_PREFERENCE_KEY);
      if (saved === "zh" || saved === "en") {
        preferred = saved;
      }
    } catch {
      // Ignore storage errors and fall back to browser language.
    }

    preferred ??= detectBrowserLocale();
    if (preferred === "en") {
      router.replace("/en/");
    }
  }, [router]);

  return null;
}
