"use client";

import { useState, useEffect } from "react";
import { botApiFetch } from "@/utils/api";
import { useRouter } from "next/navigation";
import { Square, Clock, ShieldAlert, Calendar } from "lucide-react";

interface Props {
  tournament: any;
  guildId: string;
}

export function CheckinTimeManager({ tournament, guildId }: Props) {
  const router = useRouter();
  const [loadingStop, setLoadingStop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Tick for countdown accuracy
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const checkinStart = tournament.checkin_start_at ? new Date(tournament.checkin_start_at) : null;
  const checkinEnd = tournament.checkin_end_at ? new Date(tournament.checkin_end_at) : null;
  
  const isCheckinRunning =
    tournament.status === "REGISTRATION" &&
    checkinStart &&
    checkinEnd &&
    now >= checkinStart &&
    now < checkinEnd;

  const isCheckinClosed =
    checkinEnd && now >= checkinEnd;

  const isDraft = tournament.status === "DRAFT";

  const handleStopCheckin = async () => {
    if (!window.confirm("🛑 Êtes-vous sûr de vouloir arrêter le check-in maintenant ? Cela fermera immédiatement les inscriptions et empêchera de nouvelles validations.")) return;

    setError(null);
    setLoadingStop(true);
    try {
      const res = await botApiFetch(`/api/tournaments/${tournament.id}/checkin/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur de communication avec le bot");
      }

      router.refresh();
    } catch (e: any) {
      setError(e.message || "Impossible d'arrêter le check-in.");
    } finally {
      setLoadingStop(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6 shadow-xl mb-6">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Statut du Check-in
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Suivi temps réel et contrôle manuel des inscriptions/check-ins.
          </p>
        </div>
        <div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isCheckinRunning
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : isCheckinClosed
                ? "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                : isDraft
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            }`}
          >
            {isCheckinRunning
              ? "⚡ Check-in EN COURS"
              : isCheckinClosed
              ? "🛑 Check-in CLOS"
              : isDraft
              ? "📝 Brouillon (Non publié)"
              : "📅 Planifié (Non démarré)"}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {/* 1. STATE: RUNNING (SHOW KILL SWITCH) */}
      {isCheckinRunning && checkinEnd && (
        <div className="bg-green-950/20 border border-green-800/40 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1">
            <p className="text-sm text-green-400 font-medium">
              Le check-in est actuellement ouvert sur Discord.
            </p>
            <p className="text-xs text-slate-400">
              Fin programmée : <span className="font-semibold text-white">{checkinEnd.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span> (le {checkinEnd.toLocaleDateString("fr-FR")}).
            </p>
          </div>

          <button
            onClick={handleStopCheckin}
            disabled={loadingStop}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-md shadow-red-900/35 active:scale-[0.98] disabled:opacity-50"
          >
            <Square className="w-4 h-4 fill-white" />
            {loadingStop ? "Arrêt en cours..." : "Stopper le Check-in (Kill Switch)"}
          </button>
        </div>
      )}

      {/* 2. STATE: DRAFT */}
      {isDraft && (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 flex items-center gap-3 text-slate-400">
          <Calendar className="w-5 h-5 text-slate-500" />
          <div className="text-xs">
            Le tournoi est actuellement au statut **Brouillon**. Renseignez et enregistrez des dates valides dans le formulaire ci-dessous pour le publier et planifier automatiquement les check-ins.
          </div>
        </div>
      )}

      {/* 3. STATE: PLANNED NOT STARTED */}
      {!isCheckinRunning && !isCheckinClosed && !isDraft && checkinStart && checkinEnd && (
        <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-5 flex items-center gap-3 text-slate-300">
          <Calendar className="w-5 h-5 text-blue-400" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-blue-400">Check-in planifié et en attente de démarrage :</p>
            <p>
              Du <span className="font-bold text-white">{checkinStart.toLocaleString("fr-FR")}</span> au <span className="font-bold text-white">{checkinEnd.toLocaleString("fr-FR")}</span>.
            </p>
            <p className="text-slate-400">Le bot Discord publiera l'embed et ouvrira automatiquement les validations à la date prévue.</p>
          </div>
        </div>
      )}

      {/* 4. STATE: ALREADY CLOSED */}
      {isCheckinClosed && (
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-5 flex items-center gap-3 text-slate-400">
          <ShieldAlert className="w-5 h-5 text-slate-500" />
          <div className="text-xs">
            Le check-in de ce tournoi s'est terminé le <span className="font-semibold text-slate-300">{checkinEnd.toLocaleDateString("fr-FR")} à {checkinEnd.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>.
            Vous pouvez à présent lancer le tournoi pour générer l'infrastructure Discord.
          </div>
        </div>
      )}
    </div>
  );
}
