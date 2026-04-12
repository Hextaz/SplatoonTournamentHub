"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Send, Globe, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export function VisibilityToggle({ tournamentId, initialIsPublic }: { tournamentId: string, initialIsPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ is_public: !isPublic })
        .eq("id", tournamentId);

      if (error) throw error;
      setIsPublic(!isPublic);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification de la visibilité.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${isPublic ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
        {isPublic ? (
          <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> Public</span>
        ) : (
          <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Privé</span>
        )}
      </span>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
        title={isPublic ? "Rendre privé" : "Rendre public (Publier)"}
      >
        <Send className={`w-4 h-4 ${isPublic ? 'text-emerald-400' : ''}`} />
      </button>
    </div>
  );}