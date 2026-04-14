"use client";

import { useState } from "react";
import { getBotApiUrl } from '@/utils/api';

import { RefreshCcw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  guildId: string;
  tournamentId: string;
  phaseId: string;
}

export function SyncDiscordButton({ guildId, tournamentId, phaseId }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  

  const handleSync = async () => {
    if (!window.confirm("Générer/Synchroniser les salons Discord pour cette phase ? Les capitaines de cette phase auront accès à leurs salons respectifs.")) return;

    setIsSyncing(true);
    try {
      const res = await fetch(`${getBotApiUrl()}/api/phases/${phaseId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, tournamentId })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erreur de synchronisation");
      }

      alert("Synchronisation Discord terminée avec succès !");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-[#5865F2]/20"
      title="Créer les salons de cette phase sur Discord"
    >
      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
      Sync Discord
    </button>
  );
}