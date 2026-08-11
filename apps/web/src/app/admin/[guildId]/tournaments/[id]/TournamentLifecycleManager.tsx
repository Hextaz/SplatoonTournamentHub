"use client";

import { useState } from "react";
import { botApiFetch } from '@/utils/api';
import { useRouter } from "next/navigation";
import { Rocket, Loader2, AlertOctagon } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

interface Props {
  tournamentId: string;
  guildId: string;
  status: string;
}

export function TournamentLifecycleManager({ tournamentId, guildId, status }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [loadingLaunch, setLoadingLaunch] = useState(false);
  const [loadingClose, setLoadingClose] = useState(false);

  const handleLaunch = async () => {
    if (!window.confirm(t("admin.launchConfirm"))) return;

    setLoadingLaunch(true);
    try {
      const res = await botApiFetch(`/api/tournaments/${tournamentId}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || "Erreur de communication avec le bot Discord");
      }

      router.refresh();
    } catch(err: any) {
      console.error(err);
      alert(`Erreur lors du lancement : ${err.message}`);
    } finally {
      setLoadingLaunch(false);
    }
  };

  const handleClose = async () => {
    const confirmName = window.prompt(t("admin.closePrompt"));
    if (confirmName !== "CLOTURER") {
      alert(t("admin.cancelNotice"));
      return;
    }

    setLoadingClose(true);
    try {
      const res = await botApiFetch(`/api/tournaments/${tournamentId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId }),
      });

      if (!res.ok) {
        console.warn("Discord Bot returned non-ok, finishing closure locally.");
      }

      router.refresh();
    } catch(err: any) {
      console.error(err);
      alert(`Erreur lors de la clôture : ${err.message}`);
    } finally {
      setLoadingClose(false);
    }
  };

  if (status === "COMPLETED" || status === "ARCHIVED") {
    return (
      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center mb-6">
        <span className="text-slate-400 font-medium">{t("admin.archivedNotice")}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">{t("admin.lifecycleTitle")}</h2>
        <p className="text-slate-400 text-sm">{t("admin.lifecycleDesc")}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {status !== "ACTIVE" && (
          <button
            onClick={handleLaunch}
            disabled={loadingLaunch || loadingClose}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg transition-colors"
          >
            {loadingLaunch ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
            {t("admin.launchTournament")}
          </button>
        )}

        {status === "ACTIVE" && (
          <button
            onClick={handleClose}
            disabled={loadingLaunch || loadingClose}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg transition-colors"
          >
            {loadingClose ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertOctagon className="w-5 h-5" />}
            {t("admin.closeTournament")}
          </button>
        )}
      </div>
    </div>
  );
}

