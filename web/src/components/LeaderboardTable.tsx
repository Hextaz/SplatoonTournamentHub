import React from "react";

export interface PhaseTeamStat {
  id: string;
  team_id: string;
  group_id: string | null;
  seed: number | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  forfeits: number;
  score_for: number;
  score_against: number;
  differential: number;
  points: number;
  teams: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export function LeaderboardTable({ teams }: { teams: PhaseTeamStat[] }) {
  // Sort teams: points DESC, differential DESC, score_for DESC
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.differential !== a.differential) return b.differential - a.differential;
    return b.score_for - a.score_for;
  });

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-800/60 shadow-xl bg-slate-900/50">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700/50 uppercase text-xs tracking-wider">
            <th className="px-4 py-3 text-center w-12">#</th>
            <th className="px-4 py-3">Équipe</th>
            <th className="px-3 py-3 text-center" title="Joués">J</th>
            <th className="px-3 py-3 text-center" title="Victoires">V</th>
            <th className="px-3 py-3 text-center" title="Nuls">N</th>
            <th className="px-3 py-3 text-center" title="Défaites">D</th>
            <th className="px-3 py-3 text-center" title="Forfaits">F</th>
            <th className="px-3 py-3 text-center" title="Scores Pour">SP</th>
            <th className="px-3 py-3 text-center" title="Scores Contre">SC</th>
            <th className="px-3 py-3 text-center" title="Différentiel">+/-</th>
            <th className="px-4 py-3 text-center font-bold text-blue-400">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {sortedTeams.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-6 py-8 text-center text-slate-400 italic">
                Aucune équipe dans ce groupe.
              </td>
            </tr>
          ) : (
            sortedTeams.map((stat, index) => (
              <tr 
                key={stat.id || stat.team_id}
                className="hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 py-3 text-center font-bold text-slate-500">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-200">
                  <div className="flex items-center gap-2">
                    {stat.teams?.logo_url ? (
                      <img src={stat.teams.logo_url} alt="" className="w-6 h-6 rounded-full object-cover bg-slate-800" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                        {stat.teams?.name?.substring(0, 1)}
                      </div>
                    )}
                    <span className="truncate max-w-[150px] md:max-w-[200px]" title={stat.teams?.name}>
                      {stat.teams?.name || "Équipe Inconnue"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-slate-300">{stat.played || 0}</td>
                <td className="px-3 py-3 text-center text-green-400 font-medium">{stat.wins || 0}</td>
                <td className="px-3 py-3 text-center text-slate-400 font-medium">{stat.draws || 0}</td>
                <td className="px-3 py-3 text-center text-red-400 font-medium">{stat.losses || 0}</td>
                <td className="px-3 py-3 text-center text-orange-400 font-medium">{stat.forfeits || 0}</td>
                <td className="px-3 py-3 text-center text-slate-300">{stat.score_for || 0}</td>
                <td className="px-3 py-3 text-center text-slate-300">{stat.score_against || 0}</td>
                <td className="px-3 py-3 text-center font-medium">
                  <span className={(stat.differential || 0) > 0 ? "text-emerald-400" : (stat.differential || 0) < 0 ? "text-rose-400" : "text-slate-400"}>
                    {(stat.differential || 0) > 0 ? '+' : ''}{(stat.differential || 0)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-black text-blue-400 text-base">
                  {stat.points || 0}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}