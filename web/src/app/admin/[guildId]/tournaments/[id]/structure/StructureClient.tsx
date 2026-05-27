"use client";

import { useState } from "react";
import { getBotApiUrl, botApiFetch } from '@/utils/api';

import { useRouter } from "next/navigation";
import { CopyX, GitMerge, LayoutGrid, Network, Trash2, LayoutList, MoreVertical, Search, Users, Plus } from "lucide-react";
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

  const createPhase = async (format: "SINGLE_ELIM" | "ROUND_ROBIN" | "DOUBLE_ELIM") => {
    try {
      const order = initialPhases.length + 1;
      const res = await fetch(`${getBotApiUrl()}/api/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournamentId,
          guildId: guildId,
          name: format === "ROUND_ROBIN" ? "Groupes" : (format === "DOUBLE_ELIM" ? "Playoffs (Double)" : "Playoffs"),
          format: format,
          phase_order: order,
          bracket_size: format === "ROUND_ROBIN" ? undefined : 8,
          settings: format === "ROUND_ROBIN"
            ? { points_win: 3, points_draw: 1, points_loss: 0, points_forfeit: 0 }
            : (format === "DOUBLE_ELIM" ? { bracket_reset: true } : { third_place_match: false }),
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
      const res = await botApiFetch(`/api/phases/${id}?guildId=${guildId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur inconnue');
      }

      setDropdownOpen(null);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la suppression : " + (err.message || err));
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
    <div className="space-y-8 bg-slate-950 min-h-[50vh] p-6 md:p-8 rounded-xl border border-slate-800/80">

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* Existing Phases */}
        {initialPhases.map((phase) => {
          const { icon: PhaseIcon, label: formatLabel } = getFormatDetails(phase.format);

          return (
            <div key={phase.id} className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-between shadow-lg relative min-h-[260px] group transition-all duration-300 hover:border-slate-700 hover:shadow-indigo-500/5 hover:shadow-2xl">
              {/* Card Body */}
              <div className="p-8 flex flex-col items-center justify-center flex-1 text-center h-full">
                <div className="mb-6 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                  <PhaseIcon className="w-16 h-16" strokeWidth={1.2} />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{phase.phase_order}. {phase.name}</h3>
                <p className="text-sm font-medium text-slate-400">{formatLabel}</p>
              </div>

              {/* Card Footer */}
              <div className="border-t border-slate-800 p-1.5 flex justify-between items-center bg-slate-950/80 rounded-b-xl">
                <Link
                  href={`/admin/${guildId}/tournaments/${tournamentId}/structure/${phase.id}`}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-bold px-4 py-2.5 transition-colors flex-1 text-left"
                >
                  Configurer
                </Link>

                <div className="relative mr-2">
                  <button
                    onClick={() => toggleDropdown(phase.id)}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {dropdownOpen === phase.id && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-10 py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150" onMouseLeave={() => setDropdownOpen(null)}>
                      <Link
                        href={`/admin/${guildId}/tournaments/${tournamentId}/matches?phase=${phase.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800 text-slate-300 text-sm w-full text-left transition-colors"
                      >
                        <Search className="w-4 h-4 text-slate-500" /> Matchs
                      </Link>
                      <Link
                        href={`/admin/${guildId}/tournaments/${tournamentId}/placement?phase=${phase.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800 text-slate-300 text-sm w-full text-left border-b border-slate-800 pb-3 transition-colors"
                      >
                        <Users className="w-4 h-4 text-slate-500" /> Placement
                      </Link>
                      <button
                        onClick={() => deletePhase(phase.id)}
                        disabled={isDeleting === phase.id}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-rose-500/10 text-rose-400 text-sm w-full text-left font-bold disabled:opacity-50 mt-1 transition-colors"
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
        <div className="bg-slate-900/40 rounded-xl border border-dashed border-slate-800 flex flex-col justify-center items-center p-6 min-h-[260px] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300">
          <div className="flex flex-col items-center justify-center text-center space-y-4 w-full">
            <div className="text-emerald-500 flex items-center justify-center bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20">
              <Plus className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-white font-bold text-lg">Nouvelle phase</p>
              <p className="text-slate-500 text-xs mt-1">Sélectionnez le format ci-dessous :</p>
            </div>

            {/* Format Selection (always visible and premium designed) */}
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  createPhase("ROUND_ROBIN");
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2.5 rounded-lg font-bold shadow-sm border border-slate-700 flex items-center justify-center gap-2 transition-all hover:border-emerald-500/30 hover:text-white"
              >
                <LayoutGrid className="w-4 h-4 text-emerald-400" />
                Phase de Poules
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  createPhase("SINGLE_ELIM");
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2.5 rounded-lg font-bold shadow-sm border border-slate-700 flex items-center justify-center gap-2 transition-all hover:border-indigo-500/30 hover:text-white"
              >
                <GitMerge className="w-4 h-4 text-indigo-400" />
                Phase Finale (Arbre)
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  createPhase("DOUBLE_ELIM");
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-2.5 rounded-lg font-bold shadow-sm border border-slate-700 flex items-center justify-center gap-2 transition-all hover:border-violet-500/30 hover:text-white"
              >
                <CopyX className="w-4 h-4 text-violet-400" />
                Double Élimination
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
