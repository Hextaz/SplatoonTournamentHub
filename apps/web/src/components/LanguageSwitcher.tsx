"use client";

import { useTranslation } from "@/i18n/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const { locale, setLocale } = useTranslation();

  const toggleLanguage = () => {
    setLocale(locale === "fr" ? "en" : "fr");
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-[#1a1d2d] border border-slate-800/80 transition-colors"
        title={locale === "fr" ? "Changer de langue (English)" : "Switch language (Français)"}
      >
        <Globe size={14} className="text-blue-400" />
        <span>{locale.toUpperCase()}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-[#151722] border border-slate-800/80 rounded-lg p-1 text-xs">
      <Globe size={14} className="text-slate-400 ml-1.5 mr-0.5" />
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`px-2.5 py-1 rounded font-semibold transition-colors ${
          locale === "fr"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
        }`}
        title="Français"
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2.5 py-1 rounded font-semibold transition-colors ${
          locale === "en"
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
