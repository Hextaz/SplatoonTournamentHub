"use client";

import { useState } from "react";
import { getBotApiUrl } from '@/utils/api';

import { useRouter } from "next/navigation";
import { CopyX, GitMerge, LayoutGrid, Network, Trash2, LayoutList, MoreVertical, Search, Users, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export function StructureClient({ 
  tournamentId, 
  guildId, 
  initialPhases 
}: { 
  tournamentId: string; 
  guildId: string; 
  initialPhases: any[] 
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const toggleDropdown = (id: string) => {
    if (dropdownOpen === id) setDropdownOpen(null);
    else setDropdownOpen(id);
  };

  const createPhase = async (format: "SINGLE_ELIM" | "ROUND_ROBIN") => {
    try {
      const order = initialPhases.length + 1;
      const res = await fetch(`${getBotApiUrl()}/api/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournamentId,
          name: format === "SINGLE_ELIM" ? "Playoffs" : "Groupes",
          format: format,
          phase_order: order,
          bracket_size: format === "SINGLE_ELIM" ? 8 : undefined,
          settings: format === "ROUND_ROBIN" 
            ? { points_win: 3, points_draw: 1, points_loss: 0, points_forfeit: 0 }
            : { third_place_match: false },
        }),
      });

      if (!res.ok) throw new Error("Creation error");
      const newPhase = await res.json();
      router.push(`/admin/${guildId}/tournaments/${tournamentId}/structure/${newPhase.id}`);
    } catch(e) {
      console.error(e);
      alert("Erreur lors de la création de la phase.");
    }
  };

  const deletePhase = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette phase et tous ses matchs ?")) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('phases').delete().eq('id', id);
      if (error) throw error;
      setDropdownOpen(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    } finally {
      setIsDeleting(null);
    }
  };

  const getFormatDetails = (format: string) => {
    if (format === 'SINGLE_ELIM') return { icon: GitMerge, label: 'Élimination directe' };
    if (format === 'ROUND_ROBIN') return { icon: LayoutGrid, label: 'Groupes "round-robin"' };
    if (format === 'DOUBLE_ELIM') return { icon: CopyX, label: 'Double élimination' };
    if (format === 'SWISS') return { icon: Network, label: 'Ronde suisse' };
    return { icon: LayoutList, label: 'Inconnu' };
  };

  return (
    <div className="space-y-8 bg-slate-950 min-h-[50vh] p-6 md:p-8 rounded-xl border border-slate-800">
      
      {/* Grid of Cards */}
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
              <div className="border-t border-slate-100 p-1 flex justify-between items-center bg-slate-50 rounded-b-lg">
                <Link 
                  href={`/admin/${guildId}/tournaments/${tournamentId}/structure/${phase.id}`}
                  className="text-blue-500 hover:text-blue-600 text-sm font-bold px-4 py-3 transition-colors flex-1 text-left"
                >
                  Configurer
                </Link>
                
                <div className="relative mr-2">
                  <button 
                    onClick={() => toggleDropdown(phase.id)}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-200/50 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {dropdownOpen === phase.id && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-10 py-1 overflow-hidden" onMouseLeave={() => setDropdownOpen(null)}>
                      <Link 
                        href={`/admin/${guildId}/tournaments/${tournamentId}/matches?phase=${phase.id}`}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm w-full text-left"
                      >
                        <Search className="w-4 h-4" /> Matchs
                      </Link>
                      <Link 
                        href={`/admin/${guildId}/tournaments/${tournamentId}/placement?phase=${phase.id}`}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm w-full text-left border-b border-slate-100 pb-3"
                      >
                        <Users className="w-4 h-4" /> Placement
                      </Link>
                      <button 
                        onClick={() => deletePhase(phase.id)}
                        disabled={isDeleting === phase.id}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-red-50 text-red-600 text-sm w-full text-left font-semibold disabled:opacity-50 mt-1"
                      >
                        <Trash2 className="w-4 h-4" /> {isDeleting === phase.id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add New Phase Card */}
        <div className="bg-white rounded-lg border border-dashed border-slate-300 flex flex-col justify-center items-center p-8 hover:border-green-400 hover:bg-green-50/30 transition-all cursor-pointer group min-h-[260px]">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
             <div className="text-green-500 flex items-center justify-center transition-transform group-hover:scale-110">
               <Plus className="w-16 h-16" strokeWidth={3} />
             </div>
             <p className="text-slate-600 font-bold text-lg">Créer une nouvelle phase</p>
             
             {/* Format Selection (hidden until hover) */}
             <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={() => createPhase("ROUND_ROBIN")} 
                  className="bg-white hover:bg-slate-100 text-slate-700 text-xs px-3 py-2 rounded-md font-bold shadow-sm border border-slate-200"
                >
                  <LayoutGrid className="w-4 h-4 inline-block mr-1" />
                  Groupes
                </button>
                <button 
                  onClick={() => createPhase("SINGLE_ELIM")} 
                  className="bg-white hover:bg-slate-100 text-slate-700 text-xs px-3 py-2 rounded-md font-bold shadow-sm border border-slate-200"
                >
                  <GitMerge className="w-4 h-4 inline-block mr-1" />
                  Arbre
                </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
