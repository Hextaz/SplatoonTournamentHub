"use client";

import { useTranslation } from "@/i18n/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex items-center gap-1 bg-[#151722] border border-slate-800/80 rounded-lg p-1 text-xs">
      <Globe size={14} className="text-slate-400 ml-1.5 mr-0.5" />
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`px-2 py-1 rounded font-medium transition-colors ${
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
        className={`px-2 py-1 rounded font-medium transition-colors ${
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
