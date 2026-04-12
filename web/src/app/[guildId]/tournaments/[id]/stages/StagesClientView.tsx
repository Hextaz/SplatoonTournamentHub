"use client";

import { useState, useMemo } from "react";
import { GitCommit } from "lucide-react";

type Phase = any;
type Match = any;
type Team = any;

export function StagesClientView({ phases, matches, teams }: { phases: Phase[], matches: Match[], teams: Team[] }) {
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(sortedPhases[0]?.id || null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupTab, setGroupTab] = useState<"ranking" | "rounds">("ranking");

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
    // Generate Standings
    const teamsStats: Record<string, any> = {};
    activeGroupMatches.forEach((m) => {
      if (m.team1_id && !teamsStats[m.team1_id]) {
        teamsStats[m.team1_id] = { id: m.team1_id, name: m.team1?.name, j: 0, v: 0, n: 0, d: 0, f: 0, sc: 0, diff: 0, pts: 0 };
      }
      if (m.team2_id && !teamsStats[m.team2_id]) {
        teamsStats[m.team2_id] = { id: m.team2_id, name: m.team2?.name, j: 0, v: 0, n: 0, d: 0, f: 0, sc: 0, diff: 0, pts: 0 };
      }

      if (m.status === "COMPLETED" || m.status === "FF" || m.status === "BYE") {
        const isBye = m.status === "BYE";
        
        if (isBye) {
          if (m.team1_id) {
            teamsStats[m.team1_id].j += 1;
            teamsStats[m.team1_id].v += 1;
            teamsStats[m.team1_id].pts += 3;
          }
        } else {
          if (m.team1_id) teamsStats[m.team1_id].j += 1;
          if (m.team2_id) teamsStats[m.team2_id].j += 1;
  
          const s1 = m.team1_score || 0;
          const s2 = m.team2_score || 0;
  
          if (m.team1_id) {
            teamsStats[m.team1_id].sc += s1;
            teamsStats[m.team1_id].diff += (s1 - s2);
          }
          if (m.team2_id) {
            teamsStats[m.team2_id].sc += s2;
            teamsStats[m.team2_id].diff += (s2 - s1);
          }
  
          if (s1 > s2) {
            if (m.team1_id) { teamsStats[m.team1_id].v += 1; teamsStats[m.team1_id].pts += 3; }
            if (m.team2_id) { teamsStats[m.team2_id].d += 1; }
          } else if (s2 > s1) {
            if (m.team2_id) { teamsStats[m.team2_id].v += 1; teamsStats[m.team2_id].pts += 3; }
            if (m.team1_id) { teamsStats[m.team1_id].d += 1; }
          } else {
            // Draw
            if (m.team1_id) { teamsStats[m.team1_id].n += 1; teamsStats[m.team1_id].pts += 1; }
            if (m.team2_id) { teamsStats[m.team2_id].n += 1; teamsStats[m.team2_id].pts += 1; }
          }
        }
      }
    });

    const sortedTeams = Object.values(teamsStats).sort((a: any, b: any) => b.pts - a.pts || b.diff - a.diff);

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
          <div className="overflow-x-auto bg-[#151722] rounded-lg border border-slate-800/80">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase border-b border-slate-800/80 bg-[#12141d]">
                <tr>
                  <th className="px-4 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-3 py-3 text-center">J</th>
                  <th className="px-3 py-3 text-center">V</th>
                  <th className="px-3 py-3 text-center">N</th>
                  <th className="px-3 py-3 text-center">D</th>
                  <th className="px-3 py-3 text-center">F</th>
                  <th className="px-3 py-3 text-center">SP</th>
                  <th className="px-3 py-3 text-center">SC</th>
                  <th className="px-3 py-3 text-center">+/-</th>
                  <th className="px-4 py-3 text-center font-bold text-white">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sortedTeams.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                      Aucune donnée trouvée.
                    </td>
                  </tr>
                ) : (
                  sortedTeams.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-200">{t.name}</td>
                      <td className="px-3 py-3 text-center text-slate-400">{t.j}</td>
                      <td className="px-3 py-3 text-center text-slate-400">{t.v}</td>
                      <td className="px-3 py-3 text-center text-slate-400">{t.n}</td>
                      <td className="px-3 py-3 text-center text-slate-400">{t.d}</td>
                      <td className="px-3 py-3 text-center text-slate-400">{t.f}</td>
                      <td className="px-3 py-3 text-center text-slate-400">{t.sc}</td>
                        <td className="px-3 py-3 text-center text-slate-400">0</td>
                      <td className="px-3 py-3 text-center text-slate-400">{t.diff}</td>
                      <td className="px-4 py-3 text-center font-bold text-white">{t.pts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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