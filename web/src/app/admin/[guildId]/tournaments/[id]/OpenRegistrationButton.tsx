"use client";

import { useState } from "react";
import { RefreshCw, Send } from "lucide-react";

export function OpenRegistrationButton({ tournamentId }: { tournamentId: string }) {
  const [isGeneratingEmbed, setIsGeneratingEmbed] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const onGenerateRegistrationEmbed = async () => {
    setIsGeneratingEmbed(true);
    setMessage(null);
    try {
      const res = await fetch(`http://localhost:8080/api/tournaments/${tournamentId}/registrations`, {
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
        disabled={isGeneratingEmbed}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md w-full"
      >
        {isGeneratingEmbed ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Ouvrir inscriptions (Discord)
      </button>

      {message && (
        <div className={`text-xs px-3 py-2 rounded-md ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}