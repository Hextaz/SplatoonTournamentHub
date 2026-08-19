"use client";

import { useState } from "react";
import { botApiFetch } from '@/utils/api';
import { useRouter } from "next/navigation";
import { Rocket, Loader2, AlertOctagon } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface Props {
  tournamentId: string;
  guildId: string;
  status: string;
}

export function TournamentLifecycleManager({ tournamentId, guildId, status }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingLaunch, setLoadingLaunch] = useState(false);
  const [loadingClose, setLoadingClose] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const handleLaunch = async () => {
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

      toast.success("Le tournoi a été lancé avec succès !");
      setShowLaunchModal(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors du lancement");
    } finally {
      setLoadingLaunch(false);
    }
  };

  const handleClose = async () => {
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

      toast.success("Le tournoi a été clôturé et archivé avec succès.");
      setShowCloseModal(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de la clôture");
    } finally {
      setLoadingClose(false);
    }
  };

  if (status === "COMPLETED" || status === "ARCHIVED") {
    return (
      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center mb-6">
        <span className="text-slate-400 font-medium">Ce tournoi a été clôturé et archivé. L'infrastructure Discord a été nettoyée.</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Cycle de Vie du Tournoi</h2>
          <p className="text-slate-400 text-sm">Contrôlez l'état d'avancement et gérez automatiquement l'infrastructure Discord de l'évènement.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {status !== "ACTIVE" && (
            <button
              onClick={() => setShowLaunchModal(true)}
              disabled={loadingLaunch || loadingClose}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {loadingLaunch ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
              Lancer le Tournoi
            </button>
          )}

          {status === "ACTIVE" && (
            <button
              onClick={() => setShowCloseModal(true)}
              disabled={loadingLaunch || loadingClose}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {loadingClose ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertOctagon className="w-5 h-5" />}
              Clôturer le Tournoi
            </button>
          )}
        </div>
      </div>

      {/* Modal Lancement */}
      <ConfirmModal
        isOpen={showLaunchModal}
        onClose={() => setShowLaunchModal(false)}
        onConfirm={handleLaunch}
        title="Lancer le Tournoi"
        description="Êtes-vous sûr de vouloir lancer le tournoi ? Cela créera automatiquement une catégorie Discord et annoncera le début officiel de l'évènement."
        confirmText="Lancer le Tournoi"
        variant="primary"
        icon={Rocket}
        isLoading={loadingLaunch}
      />

      {/* Modal Clôture */}
      <ConfirmModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={handleClose}
        title="Clôturer le Tournoi"
        description="Êtes-vous sûr de vouloir clôturer ce tournoi ? Cette action archivera le tournoi et supprimera définitivement les salons et la catégorie Discord associés."
        confirmText="Clôturer définitivement"
        variant="danger"
        icon={AlertOctagon}
        isLoading={loadingClose}
      />
    </>
  );
}

