"use client";

import { useState, useMemo, useEffect } from "react";
import { GitCommit } from "lucide-react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Phase = any;
type Match = any;
type Team = any;

export function StagesClientView({ phases, matches, teams, phaseTeams }: { phases: Phase[], matches: Match[], teams: Team[], phaseTeams?: any[] }) {
  const router = useRouter();
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(sortedPhases[0]?.id || null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupTab, setGroupTab] = useState<"ranking" | "rounds">("ranking");

  useEffect(() => {
    // Écoute des mises à jour des scores et du classement
    const channel = supabase.channel('public_stages_realtime')
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

  const activePhase = phases.find(p => p.id === activePhaseId);

  const phaseMatches = matches.filter(m => m.phase_id === activePhaseId);

  const isBracket = activePhase?.format === "SINGLE_ELIM" || activePhase?.format === "DOUBLE_ELIM";

  // Group phase logic
  const groupsInPhase = useMemo(() => {
    if (isBracket) return [];
    
    const explicitGroupIds = new Set(phaseMatches.map(m => m.group_id).filter(Boolean));
    if (explicitGroupIds.size > 0) {
      return Array.from(explicitGroupIds).sort() as string[];
    }

    const count = activePhase?.max_groups || 1;
    return Array.from({ length: count }).map((_, i) => String(i + 1));
  }, [activePhase, phaseMatches, isBracket]);

  // Set default group when phase changes
  useMemo(() => {
    if (!isBracket && groupsInPhase.length > 0 && (!activeGroupId || !groupsInPhase.includes(activeGroupId))) {
      setActiveGroupId(groupsInPhase[0]);
    }
  }, [isBracket, groupsInPhase, activeGroupId]);

  const activeGroupMatches = useMemo(() => {
    if (phaseMatches.some(m => m.group_id)) {
      return phaseMatches.filter(m => String(m.group_id) === String(activeGroupId));
    }
    return phaseMatches;
  }, [phaseMatches, activeGroupId]);

  const renderBracket = () => {
    // Basic flexbox bracket
    const rounds = phaseMatches.reduce((acc: any, m: any) => {
      acc[m.round_number] = acc[m.round_number] || [];
      acc[m.round_number].push(m);
      return acc;
    }, {});
    
    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    if (roundNumbers.length === 0) {
      return (
        <div className="py-12 text-center flex flex-col items-center">
          <GitCommit className="w-12 h-12 text-slate-600 mb-4 rotate-90" />
          <p className="text-slate-400">L'arbre n'a pas encore été généré.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto pb-8 pt-4 custom-scrollbar">
        <div className="flex items-stretch gap-10 min-w-max px-4">
          {roundNumbers.map((r, rIndex) => {
            const rMatches = rounds[r].sort((a: any, b: any) => a.match_number - b.match_number);
            
            return (
              <div key={r} className="flex flex-col min-w-[240px] relative justify-around pt-12" style={{ minHeight: `${(rounds[roundNumbers[0]]?.length || 1) * 110}px` }}>
                <div className="absolute top-0 left-0 right-0 text-slate-500 text-xs font-bold text-center uppercase tracking-wider">
                  Round {r}
                </div>
                
                {Array.from({ length: Math.ceil(rMatches.length / 2) }).map((_, pairIndex) => {
                  const match1 = rMatches[pairIndex * 2];
                  const match2 = rMatches[pairIndex * 2 + 1];

                  return (
                    <div key={pairIndex} className="relative flex flex-col justify-around flex-1" style={{ margin: match2 ? '0' : '0 0' }}>
                      
                      {match1 && (
                        <div className="relative z-10 bg-[#151722] border border-slate-800/80 hover:border-slate-600/80 rounded-md overflow-hidden flex flex-col shadow-sm transition-colors text-sm font-mono cursor-pointer mb-2 mt-2" style={{ height: '76px' }}>
                          <div className={`flex justify-between items-center p-2 border-b border-slate-800/50 ${(match1.status === "COMPLETED" || match1.status === "FF") && match1.team1_score > match1.team2_score ? 'bg-slate-800/30' : ''}`}>
                            <span className={`truncate mr-2 ${(match1.status === "COMPLETED" || match1.status === "FF") && match1.team1_score > match1.team2_score ? 'text-slate-200 font-bold' : match1.team1?.name ? 'text-slate-400' : 'text-slate-600 italic'}`}>
                              {match1.team1?.name || "TBD"}
                            </span>
                            <span className={`font-bold ${(match1.status === "COMPLETED" || match1.status === "FF") && match1.team1_score > match1.team2_score ? 'text-green-400' : (match1.status === "COMPLETED" || match1.status === "FF") ? 'text-slate-500' : 'text-slate-600'}`}>
                              {(match1.status === "COMPLETED" || match1.status === "FF") ? (match1.team1_score || 0) : "-"}
                            </span>
                          </div>
                          <div className={`flex justify-between items-center p-2 ${(match1.status === "COMPLETED" || match1.status === "FF") && match1.team2_score > match1.team1_score ? 'bg-slate-800/30' : ''}`}>
                            <span className={`truncate mr-2 ${(match1.status === "COMPLETED" || match1.status === "FF") && match1.team2_score > match1.team1_score ? 'text-slate-200 font-bold' : match1.team2?.name ? 'text-slate-400' : 'text-slate-600 italic'}`}>
                              {match1.team2?.name || "TBD"}
                            </span>
                            <span className={`font-bold ${(match1.status === "COMPLETED" || match1.status === "FF") && match1.team2_score > match1.team1_score ? 'text-green-400' : (match1.status === "COMPLETED" || match1.status === "FF") ? 'text-slate-500' : 'text-slate-600'}`}>
                              {(match1.status === "COMPLETED" || match1.status === "FF") ? (match1.team2_score || 0) : "-"}
                            </span>
                          </div>
                        </div>
                      )}

                      {match2 && (
                        <div className="relative z-10 bg-[#151722] border border-slate-800/80 hover:border-slate-600/80 rounded-md overflow-hidden flex flex-col shadow-sm transition-colors text-sm font-mono cursor-pointer mb-2 mt-2" style={{ height: '76px' }}>
                          <div className={`flex justify-between items-center p-2 border-b border-slate-800/50 ${(match2.status === "COMPLETED" || match2.status === "FF") && match2.team1_score > match2.team2_score ? 'bg-slate-800/30' : ''}`}>
                            <span className={`truncate mr-2 ${(match2.status === "COMPLETED" || match2.status === "FF") && match2.team1_score > match2.team2_score ? 'text-slate-200 font-bold' : match2.team1?.name ? 'text-slate-400' : 'text-slate-600 italic'}`}>
                              {match2.team1?.name || "TBD"}
                            </span>
                            <span className={`font-bold ${(match2.status === "COMPLETED" || match2.status === "FF") && match2.team1_score > match2.team2_score ? 'text-green-400' : (match2.status === "COMPLETED" || match2.status === "FF") ? 'text-slate-500' : 'text-slate-600'}`}>
                              {(match2.status === "COMPLETED" || match2.status === "FF") ? (match2.team1_score || 0) : "-"}
                            </span>
                          </div>
                          <div className={`flex justify-between items-center p-2 ${(match2.status === "COMPLETED" || match2.status === "FF") && match2.team2_score > match2.team1_score ? 'bg-slate-800/30' : ''}`}>
                            <span className={`truncate mr-2 ${(match2.status === "COMPLETED" || match2.status === "FF") && match2.team2_score > match2.team1_score ? 'text-slate-200 font-bold' : match2.team2?.name ? 'text-slate-400' : 'text-slate-600 italic'}`}>
                              {match2.team2?.name || "TBD"}
                            </span>
                            <span className={`font-bold ${(match2.status === "COMPLETED" || match2.status === "FF") && match2.team2_score > match2.team1_score ? 'text-green-400' : (match2.status === "COMPLETED" || match2.status === "FF") ? 'text-slate-500' : 'text-slate-600'}`}>
                              {(match2.status === "COMPLETED" || match2.status === "FF") ? (match2.team2_score || 0) : "-"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Flexbox Tree Connectors */}
                      {rIndex < roundNumbers.length - 1 && match2 && (
                        <div className="absolute top-[46px] bottom-[46px] -right-5 w-5 border-r-2 border-y-2 border-slate-700/60 rounded-r-md z-0 pointer-events-none"></div>
                      )}

                      {rIndex < roundNumbers.length - 1 && match1 && !match2 && (
                        <div className="absolute top-[46px] -right-10 w-10 border-t-2 border-slate-700/60 z-0 pointer-events-none"></div>
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

  const renderGroup = () => {
    // Collect `phase_teams` and pass them to LeaderboardTable
    const currentGroupPhaseTeams = phaseTeams?.filter((pt) => 
      pt.phase_id === activePhaseId && 
      (activeGroupId ? pt.group_id === activeGroupId : true)
    ) || [];

    // Matches grouped by round
    const rounds = activeGroupMatches.reduce((acc: any, m: any) => {
      acc[m.round_number] = acc[m.round_number] || [];
      acc[m.round_number].push(m);
      return acc;
    }, {});
    const roundNumbers = Object.keys(rounds).map(Number).sort((a,b) => a - b);

    return (
      <div className="space-y-6">
        {/* Sub Navigation Group */}
        {groupsInPhase.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {groupsInPhase.map((gId, index) => (
              <button
                key={gId}
                onClick={() => setActiveGroupId(gId)}
                className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
                  activeGroupId === gId
                    ? "bg-blue-600 text-white"
                    : "bg-[#151722] text-slate-400 border border-slate-800/50 hover:bg-slate-800"
                }`}
              >
                Group {index + 1}
              </button>
            ))}
          </div>
        )}

        {/* Group Tabs: Classement vs Tours */}
        <div className="flex gap-1 border-b border-slate-800/80 mb-6">
          <button
            onClick={() => setGroupTab("ranking")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              groupTab === "ranking"
                ? "border-blue-500 text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Classement
          </button>
          <button
            onClick={() => setGroupTab("rounds")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              groupTab === "rounds"
                ? "border-blue-500 text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Tours
          </button>
        </div>

        {groupTab === "ranking" ? (
          <LeaderboardTable teams={currentGroupPhaseTeams} matches={activeGroupMatches} />
        ) : (
          <div className="space-y-8">
            {roundNumbers.map(roundNum => (
              <div key={roundNum} className="space-y-3">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Round {roundNum}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rounds[roundNum].map((match: any) => {
                    const isCompleted = match.status === "COMPLETED" || match.status === "FF";
                    const isTeam1Winner = isCompleted && match.team1_score > match.team2_score;
                    const isTeam2Winner = isCompleted && match.team2_score > match.team1_score;

                    return (
                      <div key={match.id} className="bg-[#151722] border border-slate-800/80 rounded flex overflow-hidden font-mono text-sm">
                        <div className="flex flex-col w-full">
                          <div className={`flex justify-between items-center p-2.5 border-b border-slate-800/40 ${isTeam1Winner ? 'bg-slate-800/30 text-slate-200' : 'text-slate-400'}`}>
                            <span className="truncate mr-4">{match.team1?.name || "TBD"}</span>
                            <div className="flex items-center gap-3 shrink-0">
                               {isCompleted ? <span className="font-bold">{match.team1_score}</span> : <span>-</span>}
                               {isTeam1Winner && <span className="w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 rounded text-[10px] font-bold">V</span>}
                               {!isTeam1Winner && isCompleted && <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-500 rounded text-[10px] font-bold">D</span>}
                            </div>
                          </div>
                          <div className={`flex justify-between items-center p-2.5 ${isTeam2Winner ? 'bg-slate-800/30 text-slate-200' : 'text-slate-400'}`}>
                            <span className="truncate mr-4">{match.team2?.name || "TBD"}</span>
                            <div className="flex items-center gap-3 shrink-0">
                               {isCompleted ? <span className="font-bold">{match.team2_score}</span> : <span>-</span>}
                               {isTeam2Winner && <span className="w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 rounded text-[10px] font-bold">V</span>}
                               {!isTeam2Winner && isCompleted && <span className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-500 rounded text-[10px] font-bold">D</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#0f111a] text-slate-200">
      {/* Top Phase Navigation */}
      <div className="flex gap-4 mb-8">
        <div className="flex flex-wrap gap-2 items-center">
          {sortedPhases.map((phase) => (
            <button
              key={phase.id}
              onClick={() => {
                setActivePhaseId(phase.id);
                setGroupTab("ranking");
              }}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                activePhaseId === phase.id
                  ? "text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {phase.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {isBracket ? renderBracket() : renderGroup()}
      </div>
    </div>
  );
}