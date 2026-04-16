"use client";

import { useState, useEffect } from "react";
import { getBotApiUrl } from '@/utils/api';

import { useRouter } from "next/navigation";
import { Search, Trophy, Check, X, CalendarDays, Loader2, ArrowLeft, Users, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export function PhaseMatchesClient({ tournamentId, guildId, phase, initialMatches, phaseTeams, dbGroups }: any) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase.channel('admin_phase_matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        router.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phase_teams' }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const isGroups = phase.format === "ROUND_ROBIN";
  
  // Checking completion
  const totalMatches = initialMatches.length;
  const completedMatches = initialMatches.filter((m: any) => m.status === "COMPLETED" || m.status === "FF" || m.status === "BYE").length;
  const isPhaseFinished = totalMatches > 0 && completedMatches === totalMatches;

  // --- STATE FOR MODAL ---
  const [mTeam1Score, setMTeam1Score] = useState(0);
  const [mTeam2Score, setMTeam2Score] = useState(0);
  const [mTeam1Ff, setMTeam1Ff] = useState(false);
  const [mTeam2Ff, setMTeam2Ff] = useState(false);

  const openMatchEdit = (match: any) => {
    setSelectedMatch(match);
    setMTeam1Score(match.team1_score || 0);
    setMTeam2Score(match.team2_score || 0);
    const isT1Ff = match.status === "FF" && (match.team1_score || 0) < (match.team2_score || 0);
    const isT2Ff = match.status === "FF" && (match.team2_score || 0) < (match.team1_score || 0);
    // Rough approximation of FF from DB.
    setMTeam1Ff(isT1Ff);
    setMTeam2Ff(isT2Ff);
  };

  const handleUpdateMatch = async () => {
    setIsSubmitting(true);
    const isFf = mTeam1Ff || mTeam2Ff;
    const finalData = {
      team1_score: mTeam1Score,
      team2_score: mTeam2Score,
      status: isFf ? "FF" : "COMPLETED"
    };

    try {
      const res = await fetch(`${getBotApiUrl()}/api/matches/${selectedMatch.id}/force-score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData)
      });
      if (!res.ok) throw new Error("API Error");
      setSelectedMatch(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Impossible de mettre à jour le match.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERING HELPERS ---
  const getBadgeClass = (res: string, target: string) => {
    if (res !== target) return "bg-slate-800 text-slate-500 border border-slate-700";
    if (target === "V") return "bg-green-500 text-white font-bold border border-green-600 shadow-sm";
    if (target === "D") return "bg-red-500 text-white font-bold border border-red-600 shadow-sm";
    return "bg-[#0f111a]0 text-white font-bold border border-slate-600 shadow-sm"; // N
  };

  const renderBadgeRow = (isTeam1: boolean) => {
    let t1Res = "N"; let t2Res = "N";
    if (mTeam1Ff && mTeam2Ff) { t1Res = "D"; t2Res = "D"; }
    else if (mTeam1Ff) { t1Res = "D"; t2Res = "V"; }
    else if (mTeam2Ff) { t1Res = "V"; t2Res = "D"; }
    else if (mTeam1Score > mTeam2Score) { t1Res = "V"; t2Res = "D"; }
    else if (mTeam1Score < mTeam2Score) { t1Res = "D"; t2Res = "V"; }

    const targetRes = isTeam1 ? t1Res : t2Res;
    
    return (
      <div className="flex gap-1">
        <div className={`w-8 h-8 flex flex-col items-center justify-center text-xs rounded ${getBadgeClass(targetRes, "V")}`}>V</div>
        <div className={`w-8 h-8 flex flex-col items-center justify-center text-xs rounded ${getBadgeClass(targetRes, "N")}`}>N</div>
        <div className={`w-8 h-8 flex flex-col items-center justify-center text-xs rounded ${getBadgeClass(targetRes, "D")}`}>D</div>
      </div>
    );
  };

  const getMatchStatusText = (match: any) => {
    if (match.status === "COMPLETED" || match.status === "FF") return "Terminé";
    if (match.team1_id && match.team2_id) return "A jouer";
    return "En attente";
  };


  // --- GROUPS (ROUND ROBIN) RENDER ---
  const renderGroups = () => {
    if (selectedGroup === null) {
      const groupCount = phase.max_groups || 1;
      const displayGroups = dbGroups?.length 
        ? dbGroups 
        : Array.from({length: groupCount}).map((_, i) => ({ id: String(i + 1), name: `Group ${i + 1}` }));

      return (
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Groupes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayGroups.map((g: any, i: number) => (
              <div 
                key={g.id || i} 
                onClick={() => setSelectedGroup(g.id)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition-all flex flex-col items-center justify-center group shadow-md"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">{g.name || `Group ${i + 1}`}</h3>
                <span className="text-sm text-slate-500 mt-2">Cliquez pour voir les détails</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Individual Group Detail
    const activeGroupMatches = initialMatches.filter((m: any) => String(m.group_id) === String(selectedGroup));

    const rounds = activeGroupMatches.reduce((acc: any, m: any) => {
      acc[m.round_number] = acc[m.round_number] || [];
      acc[m.round_number].push(m);
      return acc;
    }, {});

    // Filter Phase Teams matching this group
    const currentGroupPhaseTeams = phaseTeams?.filter((pt: any) => 
      String(pt.group_id) === String(selectedGroup)
    ) || [];

    return (
      <div className="p-6 md:p-8 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold transition-colors">
            <ArrowLeft className="w-5 h-5"/> Retour aux Groupes
          </button>
          <div className="flex gap-2">
            <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-sm font-bold rounded shadow-sm border border-slate-700">Tie-break manuel</button>
            <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 text-sm font-bold rounded shadow-sm flex items-center gap-2">
              <Check className="w-4 h-4"/> Valider
            </button>
          </div>
        </div>

        {/* Classement */}
        <div className="mb-8">
          <LeaderboardTable teams={currentGroupPhaseTeams} matches={activeGroupMatches} settings={phase?.settings} />
        </div>

        {/* Rounds matches */}
        <div className="flex flex-col gap-6">
           {Object.keys(rounds).sort((a,b) => Number(a)-Number(b)).map(roundNum => (
             <div key={roundNum} className="flex flex-col gap-3">
               <h4 className="text-xl font-bold text-slate-400">Round {roundNum}</h4>
               <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                 {rounds[roundNum].map((match: any) => {
                    const isCompleted = match.status === "COMPLETED" || match.status === "FF";
                    const isPending = !match.team1_id || !match.team2_id;
                    
                    return (
                      <div 
                        key={match.id}
                        onClick={() => !isPending && openMatchEdit(match)}
                        className={`bg-[#151722] rounded border ${isPending ? 'border-slate-700/50 opacity-50 cursor-not-allowed' : 'border-slate-800/50 cursor-pointer hover:border-blue-400'} shadow-sm flex flex-col overflow-hidden transition-colors`}
                      >
                         <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
                            <span className={`text-sm font-semibold truncate ${match.team1_score > match.team2_score ? 'text-white' : 'text-slate-500'}`}>
                              {match.team1?.name || 'TBD'}
                            </span>
                            {isCompleted && <span className="text-sm font-bold ml-2">{match.team1_score}</span>}
                         </div>
                         <div className="flex items-center justify-between p-3">
                            <span className={`text-sm font-semibold truncate ${match.team2_score > match.team1_score ? 'text-white' : 'text-slate-500'}`}>
                              {match.team2?.name || 'TBD'}
                            </span>
                            {isCompleted && <span className="text-sm font-bold ml-2">{match.team2_score}</span>}
                         </div>
                      </div>
                    )
                 })}
               </div>
             </div>
           ))}
        </div>

      </div>
    );
  };


  // --- BRACKET RENDER ---
  const renderBracket = () => {
    // Organise matches by round
    const rounds = initialMatches.reduce((acc: any, m: any) => {
      acc[m.round_number] = acc[m.round_number] || [];
      acc[m.round_number].push(m);
      return acc;
    }, {});
    
    const roundNumbers = Object.keys(rounds).map(Number).sort((a,b) => a-b);

    if (roundNumbers.length === 0) {
      return (
        <div className="py-12 text-center flex flex-col items-center">
          <p className="text-slate-400">L'arbre n'a pas encore été généré.</p>
        </div>
      );
    }

    return (
      <div className="bg-[#0f111a] overflow-x-auto pb-8 pt-4 custom-scrollbar min-h-[600px]">
        <div className="flex items-stretch gap-10 min-w-max px-8">
          {roundNumbers.map((r, rIndex) => {
            const rMatches = rounds[r].sort((a:any, b:any) => a.match_number - b.match_number);
            
            return (
              <div key={r} className="flex flex-col min-w-[240px] relative justify-around pt-12" style={{ minHeight: `${(rounds[roundNumbers[0]]?.length || 1) * 110}px` }}>
                <div className="absolute top-0 left-0 right-0 text-slate-500 text-xs font-bold text-center py-2 uppercase tracking-wider bg-[#151722] rounded-md border border-slate-800/50">
                  Round {r}
                </div>
                
                {Array.from({ length: Math.ceil(rMatches.length / 2) }).map((_, pairIndex) => {
                  const match1 = rMatches[pairIndex * 2];
                  const match2 = rMatches[pairIndex * 2 + 1];

                  const renderMatchBox = (match: any, index: number) => {
                    if (!match) return null;
                    const isBye = !match.team2_id && r === 1 && match.team1_id;
                    const isTBD = !match.team1_id && !match.team2_id;
                    const isCompleted = match.status === "COMPLETED" || match.status === "FF";
                    const team1Bold = match.team1_score > match.team2_score;
                    const team2Bold = match.team2_score > match.team1_score;

                    return (
                      <div key={match.id}
                        onClick={() => !isTBD && openMatchEdit(match)}
                        className={`relative z-10 bg-[#151722] border ${isTBD ? 'border-slate-700/50' : 'border-slate-800/50 cursor-pointer hover:border-blue-400'} rounded-lg shadow-sm flex flex-col overflow-hidden text-sm transition-colors text-slate-400 mb-2 mt-2`} 
                        style={{ height: '80px' }}
                      >
                         <div className="flex items-stretch border-b border-slate-700/50 h-10">
                            <div className={`flex-1 px-3 flex flex-col justify-center truncate ${team1Bold ? 'font-bold text-slate-200' : 'font-medium text-slate-500'}`}>
                               {match.team1?.name ? (
                                  <div className="flex flex-col leading-tight"><span className="text-[10px] text-slate-400">Seed -</span><span>{match.team1?.name}</span></div>
                               ) : "TBD"}
                            </div>
                            {isCompleted && (
                               <div className="px-3 border-l border-slate-700/50 flex items-center justify-center font-bold text-slate-300 w-10 shrink-0 bg-[#0f111a]">
                                 {match.team1_score}
                               </div>
                            )}
                         </div>
                         <div className="flex items-stretch h-10">
                            <div className={`flex-1 px-3 flex flex-col justify-center truncate ${team2Bold ? 'font-bold text-slate-200' : 'font-medium text-slate-500'}`}>
                               {match.team2?.name ? (
                                  <div className="flex flex-col leading-tight"><span className="text-[10px] text-slate-400">Seed -</span><span>{match.team2?.name}</span></div>                                 ) : isBye ? (
                                    <span className="text-slate-400 font-bold italic">BYE (TBD)</span>                               ) : "TBD"}
                            </div>
                            {isCompleted && (
                               <div className="px-3 border-l border-slate-700/50 flex items-center justify-center font-bold text-slate-300 w-10 shrink-0 bg-[#0f111a]">
                                 {match.team2_score}
                               </div>
                            )}
                         </div>
                      </div>
                    );
                  };

                  return (
                    <div key={pairIndex} className="relative flex flex-col justify-around flex-1" style={{ margin: match2 ? '0' : '0 0' }}>
                      {renderMatchBox(match1, 0)}
                      {renderMatchBox(match2, 1)}

                      {/* Flexbox Tree Connectors */}
                      {rIndex < roundNumbers.length - 1 && match2 && (
                        <div className="absolute top-[48px] bottom-[48px] -right-5 w-5 border-r-2 border-y-2 border-slate-700/60 rounded-r-md z-0 pointer-events-none"></div>
                      )}

                      {rIndex < roundNumbers.length - 1 && match1 && !match2 && (
                        <div className="absolute top-[48px] -right-10 w-10 border-t-2 border-slate-700/60 z-0 pointer-events-none"></div>
                      )}

                      {rIndex < roundNumbers.length - 1 && match2 && (
                        <div className="absolute top-1/2 -right-10 w-5 border-t-2 border-slate-700/60 z-0 pointer-events-none"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  return (
    <div className="relative flex-1 flex flex-col bg-slate-950">
      
      {/* Banner for completed phase */}
      {isPhaseFinished && (
        <div className="bg-green-500/10 border-b border-green-500/20 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-green-400">
            <Check className="w-5 h-5" />
            <p className="font-semibold text-sm">
              Phase terminée ! Les résultats finaux ont été validés. ({completedMatches}/{totalMatches} matchs joués)
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
         {isGroups ? renderGroups() : renderBracket()}
      </div>

      {/* MATCH EDIT MODAL */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-[#151722] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 pb-0 flex flex-col items-center text-center shrink-0">
               <h2 className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-4">
                 Match #{selectedMatch.round_number}.{selectedMatch.match_number}
               </h2>
               <div className="flex items-center gap-12 w-full justify-center">
                 <span className="text-2xl font-bold text-slate-200 flex-1 text-right truncate bg-[#0f111a] px-4 py-2 rounded-lg border border-slate-700/50">{selectedMatch.team1?.name}</span>
                 <span className="text-sm font-bold text-slate-400 uppercase">VS</span>
                 <span className="text-2xl font-bold text-slate-200 flex-1 text-left truncate bg-[#0f111a] px-4 py-2 rounded-lg border border-slate-700/50">{selectedMatch.team2?.name}</span>
               </div>
               <div className="mt-4 text-sm font-semibold text-slate-500 bg-slate-800 px-4 py-1.5 rounded-full flex items-center gap-2">
                 <CalendarDays className="w-4 h-4"/>
                 {getMatchStatusText(selectedMatch)}
               </div>
            </div>

            {/* Tabs Mock */}
            <div className="px-8 mt-6 border-b border-slate-800/50 flex gap-6 shrink-0">
              <div className="pb-3 border-b-2 border-blue-500 text-blue-600 font-bold text-sm cursor-pointer">Résultat</div>
              <div className="pb-3 border-transparent text-slate-500 font-bold text-sm cursor-pointer">Infos</div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-[#151722] p-8">
               <h3 className="text-xl font-bold text-slate-200 mb-6 border-b border-slate-700/50 pb-2">Match</h3>
               
               <table className="w-full">
                  <thead>
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                      <th className="text-left pb-4 w-1/2">Nom</th>
                      <th className="text-center pb-4 w-24">Forfait</th>
                      <th className="text-center pb-4 w-32">Score</th>
                      <th className="text-right pb-4 w-32 pr-2">Résultat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-4 font-bold text-slate-200 text-lg">
                        {selectedMatch.team1?.name}
                      </td>
                      <td className="py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={mTeam1Ff}
                          onChange={(e) => setMTeam1Ff(e.target.checked)}
                          className="w-5 h-5 rounded text-blue-600 accent-blue-600"
                        />
                      </td>
                      <td className="py-4 text-center">
                         <input 
                           type="number" 
                           min="0"
                           value={mTeam1Score}
                           onChange={(e) => setMTeam1Score(Number(e.target.value))}
                           disabled={mTeam1Ff}
                           className="w-20 px-3 py-2 border border-slate-600/50 rounded shadow-sm text-center font-bold text-slate-200 bg-[#151722] disabled:opacity-50"
                         />
                      </td>
                      <td className="py-4 flex justify-end">
                         {renderBadgeRow(true)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-4 font-bold text-slate-200 text-lg">
                        {selectedMatch.team2?.name}
                      </td>
                      <td className="py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={mTeam2Ff}
                          onChange={(e) => setMTeam2Ff(e.target.checked)}
                          className="w-5 h-5 rounded text-blue-600 accent-blue-600"
                        />
                      </td>
                      <td className="py-4 text-center">
                         <input 
                           type="number" 
                           min="0"
                           value={mTeam2Score}
                           onChange={(e) => setMTeam2Score(Number(e.target.value))}
                           disabled={mTeam2Ff}
                           className="w-20 px-3 py-2 border border-slate-600/50 rounded shadow-sm text-center font-bold text-slate-200 bg-[#151722] disabled:opacity-50"
                         />
                      </td>
                      <td className="py-4 flex justify-end">
                         {renderBadgeRow(false)}
                      </td>
                    </tr>
                  </tbody>
               </table>
            </div>

            {/* Footer */}
            <div className="bg-[#0f111a] px-8 py-5 border-t border-slate-800/50 flex justify-end gap-3 shrink-0">
               <button 
                 onClick={() => setSelectedMatch(null)}
                 disabled={isSubmitting}
                 className="px-6 py-2.5 bg-[#0f111a]0 hover:bg-slate-600 text-white font-bold rounded shadow-sm transition-colors flex items-center gap-2"
               >
                 <ArrowLeft className="w-4 h-4"/> Retour
               </button>
               <button 
                 onClick={handleUpdateMatch}
                 disabled={isSubmitting}
                 className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded shadow-sm transition-colors flex items-center gap-2"
               >
                 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : "Mettre à jour"}
               </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
