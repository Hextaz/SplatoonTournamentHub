"use client";

import { useEffect } from "react";
import { useTranslation } from "@/i18n/LanguageContext";

export default function GlobalError({
  error: errorObj,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error("Global error caught:", errorObj);
  }, [errorObj]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4 text-center">
      <div className="text-5xl">💥</div>
      <h2 className="text-2xl font-bold text-white">{t("error.title")}</h2>
      <p className="text-slate-400 max-w-md">
        {t("error.desc")}
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
        >
          {t("error.retry")}
        </button>
        <a
          href="/"
          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
        >
          {t("error.home")}
        </a>
      </div>
    </div>
  );
}
