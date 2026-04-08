"use client";

import { useState } from "react";
import { Users, GitCommit } from "lucide-react";

type Team = any;
type Phase = any;
type Match = any;

export function PublicTournamentTabs({ 
  tournament, 
  teams, 
  phases, 
  matches 
}: { 
  tournament: any, 
  teams: Team[], 
  phases: Phase[], 
  matches: Match[] 
}) {
  const [activeTab, setActiveTab] = useState<"teams" | "bracket">("teams");

  // Group matches by round
  const matchesByRound = matches.reduce((acc: Record<number, Match[]>, match) => {
    const round = match.round_number || 1;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {});

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <div className="flex space-x-2 bg-slate-800 p-2 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("teams")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === "teams"
              ? "bg-slate-700 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          }`}
        >
          <Users className="w-4 h-4" />
          Équipes Inscriptes ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab("bracket")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === "bracket"
              ? "bg-slate-700 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          }`}
        >
          <GitCommit className="w-4 h-4 rotate-90" />
          Arbre du Tournoi
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-slate-800/40 rounded-2xl border border-slate-700 p-6 min-h-[500px]">
        {activeTab === "teams" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teams.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune équipe inscrite pour le moment.</p>
              </div>
            ) : (
              teams.map((team) => (
                <div key={team.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex items-center justify-between hover:border-slate-500 transition-colors">
                  <span className="font-bold text-lg text-slate-200 truncate pr-4">{team.name}</span>
                  <div title="Check-in validé" className="w-3 h-3 flex-shrink-0 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="w-full relative">
            {matches.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center">
                <GitCommit className="w-12 h-12 text-slate-600 mb-4 rotate-90" />
                <p className="text-slate-400">L'arbre n'a pas encore été généré pour ce tournoi.</p>
              </div>
            ) : (
              <div className="flex overflow-x-auto pb-8 snap-x gap-12 px-4 py-8">
                {rounds.map((round) => (
                  <div key={round} className="flex flex-col justify-center gap-8 w-64 snap-center shrink-0">
                    <h3 className="text-center font-bold text-slate-400 mb-2 border-b border-slate-700 pb-3">
                      Round {round}
                    </h3>
                    
                    {matchesByRound[round].map((match: any) => {
                      const team1 = teams.find(t => t.id === match.team1_id);
                      const team2 = teams.find(t => t.id === match.team2_id);
                      const isT1Winner = match.winner_id === match.team1_id;
                      const isT2Winner = match.winner_id === match.team2_id;
                      
                      return (
                        <div key={match.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shadow-lg relative group transition-all hover:border-slate-500">
                          {/* Team 1 */}
                          <div className={`p-4 border-b border-slate-700/50 flex justify-between items-center ${isT1Winner ? 'bg-green-900/10' : ''}`}>
                            <span className={`font-medium truncate pr-4 ${isT1Winner ? 'text-green-400' : 'text-slate-300'}`}>
                              {team1?.name || "TBD"}
                            </span>
                            <span className={`font-bold ${isT1Winner ? 'text-green-400' : 'text-slate-500'}`}>
                              {match.team1_score ?? '-'}
                            </span>
                          </div>
                          
                          {/* Team 2 */}
                          <div className={`p-4 flex justify-between items-center ${isT2Winner ? 'bg-green-900/10' : ''}`}>
                            <span className={`font-medium truncate pr-4 ${isT2Winner ? 'text-green-400' : 'text-slate-300'}`}>
                              {team2?.name || "TBD"}
                            </span>
                            <span className={`font-bold ${isT2Winner ? 'text-green-400' : 'text-slate-500'}`}>
                              {match.team2_score ?? '-'}
                            </span>
                          </div>

                          {/* Decorative vs middle marker */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-slate-700 rounded-r-md"></div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
