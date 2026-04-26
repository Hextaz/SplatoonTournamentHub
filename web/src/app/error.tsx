"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4 text-center">
      <div className="text-5xl">💥</div>
      <h2 className="text-2xl font-bold text-white">Une erreur est survenue</h2>
      <p className="text-slate-400 max-w-md">
        Une erreur inattendue s&apos;est produite. Vous pouvez réessayer ou revenir à l&apos;accueil.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
        >
          Accueil
        </a>
      </div>
    </div>
  );
}
