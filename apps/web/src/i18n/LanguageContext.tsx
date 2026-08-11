"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, TranslationParams } from "./types";
import { defaultLocale, t as translate } from "./index";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "tournament_hub_locale";
const COOKIE_NAME = "NEXT_LOCALE";

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale || defaultLocale,
  );

  useEffect(() => {
    // 1. Try reading from localStorage on mount
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "fr" || saved === "en") {
      if (saved !== locale) {
        setLocaleState(saved);
        document.documentElement.lang = saved;
        document.cookie = `${COOKIE_NAME}=${saved}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } else {
      // Check navigator language
      const navLang = navigator.language?.toLowerCase();
      if (navLang?.startsWith("en")) {
        setLocaleState("en");
        document.documentElement.lang = "en";
        document.cookie = `${COOKIE_NAME}=en; path=/; max-age=31536000; SameSite=Lax`;
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.cookie = `${COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;
    }
    // Instantly refresh Server Component routes without manual page reload
    router.refresh();
  };

  const t = (key: string, params?: TranslationParams) => {
    return translate(locale, key, params);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}


export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Safe fallback if used outside provider
    return {
      locale: defaultLocale,
      setLocale: () => {},
      t: (key: string, params?: TranslationParams) =>
        translate(defaultLocale, key, params),
    };
  }
  return context;
}
