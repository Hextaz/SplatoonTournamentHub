"use client";

import { useState } from "react";
import { getBotApiUrl } from '@/utils/api';

import { RefreshCw, Send } from "lucide-react";

export function OpenRegistrationButton({ tournamentId, isRegistrationOpen, isPublic, hasStartedOrCheckin }: { tournamentId: string, isRegistrationOpen: boolean, isPublic: boolean, hasStartedOrCheckin: boolean }) {
  const [isGeneratingEmbed, setIsGeneratingEmbed] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const isDisabled = isGeneratingEmbed || isRegistrationOpen || !isPublic || hasStartedOrCheckin;

  const onGenerateRegistrationEmbed = async () => {
    setIsGeneratingEmbed(true);
    setMessage(null);
    try {
      const res = await fetch(`${getBotApiUrl()}/api/tournaments/${tournamentId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open" })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: "Embed d'inscription envoyé sur Discord !" });
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: "Erreur Discord: " + (errorData.error || "Inconnue") });
      }
    } catch(e: any) {
        setMessage({ type: 'error', text: "Erreur: " + e.message });
    } finally {
        setIsGeneratingEmbed(false);
        // Clear success message after 5 seconds to avoid clutter
        setTimeout(() => setMessage(null), 5000);
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full mt-4">
      <button
        onClick={onGenerateRegistrationEmbed}
        disabled={isDisabled}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md w-full ${isDisabled ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
      >
        {isGeneratingEmbed ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {isRegistrationOpen 
          ? "Inscriptions déjà ouvertes" 
          : !isPublic 
            ? "Tournoi privé (inscriptions bloquées)"
            : hasStartedOrCheckin
              ? "Date de check-in / début dépassée"
              : "Ouvrir inscriptions (Discord)"}
      </button>

      {message && (
        <div className={`text-xs px-3 py-2 rounded-md ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}