"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, ShieldAlert, SkipForward } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const scoreSchema = z.object({
  team1_score: z.number().min(0),
  team2_score: z.number().min(0),
});

export function MatchesClient({ tournamentId, guildId, phase, initialMatches }: any) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(scoreSchema),
    defaultValues: { team1_score: 0, team2_score: 0 }
  });

  const rounds = initialMatches.reduce((acc: any, match: any) => {
    if (!acc[match.round_number]) acc[match.round_number] = [];
    acc[match.round_number].push(match);
    return acc;
  }, {});

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  const handleMatchClick = (match: any) => {
    if (!match.team1_id || !match.team2_id) {
       alert("Ce match n'a pas encore deux opposants.");
       return;
    }
    
    if (match.status === "COMPLETED" || match.status === "FF") {
      if (!confirm("Ce match est déjà terminé. Voulez-vous vraiment surcharger le score ?")) return;
    }

    setSelectedMatch(match);
    reset({
      team1_score: match.team1_score || 0,
      team2_score: match.team2_score || 0
    });
  };

  const onSubmitScore = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8080/api/matches/${selectedMatch.id}/force-score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error("Erreur API lors de l'enregistrement");

      setSelectedMatch(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Impossible de forcer le score.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col items-start overflow-auto">
      
      {/* Bracket Viewer Flexbox Scaffold */}
      <div className="flex gap-12 bg-slate-900/50 p-8 rounded-xl border border-slate-700 min-h-[500px]">
        {roundNumbers.map((roundNum, roundIndex) => (
          <div key={roundNum} className="flex flex-col justify-around gap-6 min-w-[220px]">
             <h3 className="text-center font-bold text-slate-500 uppercase tracking-widest mb-4">
                Round {roundNum}
             </h3>

             {rounds[roundNum].map((match: any) => {
                const isCompleted = match.status === "COMPLETED" || match.status === "FF";
                const isOngoing = match.team1_id && match.team2_id && !isCompleted;
                const winnerId = (match.team1_score > match.team2_score) ? match.team1_id : match.team2_id;

                const borderColorClass = isCompleted 
                  ? "border-green-500/50 hover:border-green-400" 
                  : isOngoing 
                    ? "border-blue-500/50 hover:border-blue-400" 
                    : "border-slate-700 hover:border-slate-500";

                const bgClass = isCompleted ? "bg-slate-800" : isOngoing ? "bg-slate-800" : "bg-slate-900/50 bg-opacity-70";

                return (
                  <button 
                    key={match.id}
                    onClick={() => handleMatchClick(match)}
                    className={`relative flex flex-col text-left border-2 rounded-lg transition-all shadow-md group overflow-hidden ${borderColorClass} ${bgClass}`}
                  >
                    {/* Team 1 Area */}
                    <div className={`p-2 flex items-center justify-between border-b border-slate-700 ${isCompleted && match.team1_id === winnerId ? 'bg-green-500/10' : ''}`}>
                       <span className={`font-bold truncate w-32 ${match.team1 ? 'text-white' : 'text-slate-600'}`}>
                         {match.team1?.name || "TBD"}
                       </span>
                       <span className={`font-mono text-sm ${isOngoing ? 'text-blue-400 font-bold' : isCompleted ? 'text-slate-300' : 'text-slate-600'}`}>
                         {match.team1_score !== null ? match.team1_score : "-"}
                       </span>
                    </div>

                    {/* Team 2 Area */}
                    <div className={`p-2 flex items-center justify-between ${isCompleted && match.team2_id === winnerId ? 'bg-green-500/10' : ''}`}>
                       <span className={`font-bold truncate w-32 ${match.team2 ? 'text-white' : 'text-slate-600'}`}>
                         {match.team2?.name || "TBD"}
                       </span>
                       <span className={`font-mono text-sm ${isOngoing ? 'text-blue-400 font-bold' : isCompleted ? 'text-slate-300' : 'text-slate-600'}`}>
                         {match.team2_score !== null ? match.team2_score : "-"}
                       </span>
                    </div>

                    {/* Pending label overlay for missing opponents */}
                    {!isCompleted && !isOngoing && (
                       <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[1px] transition-all">
                         <span className="bg-slate-800 border border-slate-600 text-slate-300 text-xs px-2 py-1 rounded shadow pointer-events-none">
                           En attente
                         </span>
                       </div>
                    )}
                  </button>
                )
             })}
          </div>
        ))}
      </div>

      {/* GOD MODE MODAL */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-slate-800 border border-blue-500/50 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                 <ShieldAlert className="w-5 h-5 text-blue-400" />
                 Forcer le Résultat
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Le TO ("God Mode") peut surcharger manuellement le tableau. Le vainqueur sera automatiquement avancé au tour suivant.
              </p>

              <form onSubmit={handleSubmit(onSubmitScore)} className="space-y-4">
                 
                 <div className="flex items-center justify-between gap-4 bg-slate-900 p-4 border border-slate-700 rounded-lg">
                    <div className="flex flex-col">
                       <span className="font-bold text-white mb-2">{selectedMatch.team1?.name}</span>
                       <input 
                         type="number" 
                         {...register("team1_score", { valueAsNumber: true })}
                         className="w-20 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                       />
                    </div>
                    <span className="text-slate-500 font-black italic">VS</span>
                    <div className="flex flex-col items-end">
                       <span className="font-bold text-white mb-2">{selectedMatch.team2?.name}</span>
                       <input 
                         type="number" 
                         {...register("team2_score", { valueAsNumber: true })}
                         className="w-20 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                       />
                    </div>
                 </div>

                 <div className="flex gap-3 justify-end mt-6">
                    <button 
                      type="button" 
                      onClick={() => setSelectedMatch(null)}
                      className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                    >
                      Annuler
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                    >
                      {isSubmitting ? "Surcharge..." : "Valider Forçage"}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}