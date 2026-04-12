"use client";

import { CopyX, GitMerge, LayoutGrid, Network, LayoutList } from "lucide-react";
import Link from "next/link";

export function PlacementOverviewClient({ 
  tournamentId, 
  guildId, 
  initialPhases 
}: { 
  tournamentId: string; 
  guildId: string; 
  initialPhases: any[] 
}) {

  const getFormatDetails = (format: string) => {
    if (format === 'SINGLE_ELIM') return { icon: GitMerge, label: 'Élimination directe' };
    if (format === 'ROUND_ROBIN') return { icon: LayoutGrid, label: 'Groupes "round-robin"' };
    if (format === 'DOUBLE_ELIM') return { icon: CopyX, label: 'Double élimination' };
    if (format === 'SWISS') return { icon: Network, label: 'Ronde suisse' };
    return { icon: LayoutList, label: 'Inconnu' };
  };

  return (
    <div className="space-y-8 bg-slate-950 min-h-[50vh] p-6 md:p-8 rounded-xl border border-slate-800">
      
      {initialPhases.length === 0 ? (
        <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-6 rounded-xl text-center">
          Aucune phase trouvée. Veuillez générer une phase depuis l'onglet Structure d'abord.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* Existing Phases */}
          {initialPhases.map((phase) => {
            const { icon: PhaseIcon, label: formatLabel } = getFormatDetails(phase.format);
            
            return (
              <div key={phase.id} className="bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-sm relative min-h-[260px] group transition-shadow hover:shadow-md">
                {/* Card Body */}
                <div className="p-8 flex flex-col items-center justify-center flex-1 text-center h-full">
                  <div className="mb-6 flex items-center justify-center text-slate-300 group-hover:text-blue-400 transition-colors">
                     <PhaseIcon className="w-16 h-16" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">{phase.phase_order}. {phase.name}</h3>
                  <p className="text-sm font-medium text-slate-500">{formatLabel}</p>
                </div>

                {/* Card Footer */}
                <div className="border-t border-slate-100 p-1 flex justify-center items-center bg-slate-50 rounded-b-lg">
                  <Link 
                    href={`/admin/${guildId}/tournaments/${tournamentId}/placement/${phase.id}`}
                    className="text-blue-500 hover:text-blue-600 text-sm font-bold px-4 py-3 transition-colors w-full text-center"
                  >
                    Gérer les placements
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
