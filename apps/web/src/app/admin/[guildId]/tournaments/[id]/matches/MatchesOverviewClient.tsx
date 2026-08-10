"use client";

import { useMemo } from "react";
import { Trophy, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

export function MatchesOverviewClient({ guildId, tournamentId, allMatches }: { guildId: string; tournamentId: string; allMatches: any[] }) {
  const stats = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let ff = 0;

    allMatches.forEach((m) => {
      if (m.status === "COMPLETED") completed++;
      else if (m.status === "FF") ff++;
      else pending++;
    });

    return {
      total: allMatches.length,
      pending,
      completed,
      ff
    };
  }, [allMatches]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Trophy className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-slate-300">Total Matchs</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-semibold text-slate-300">En attente</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.pending}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-slate-300">Terminés</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.completed}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <h3 className="font-semibold text-slate-300">Forfaits</h3>
          </div>
          <p className="text-3xl font-bold text-white">{stats.ff}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800/60 pb-3">
          <h2 className="text-lg font-semibold text-white">Tous les matchs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800/60">
              <tr>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium">Round / Match</th>
                <th className="px-4 py-3 font-medium">Équipe 1</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Équipe 2</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {allMatches.map((match) => (
                <tr key={match.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">{match.phase?.name || "-"}</td>
                  <td className="px-4 py-3">R{match.round_number} - M{match.match_number}</td>
                  <td className="px-4 py-3 text-white font-medium">{match.team1?.name || "TBD"}</td>
                  <td className="px-4 py-3 text-center text-slate-400 font-mono">
                    {match.status === "PENDING" ? "-" : `${match.team1_score ?? 0} - ${match.team2_score ?? 0}`}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{match.team2?.name || "TBD"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      match.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" :
                      match.status === "FF" ? "bg-rose-500/10 text-rose-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {match.status}
                    </span>
                  </td>
                </tr>
              ))}
              {allMatches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Aucun match généré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
