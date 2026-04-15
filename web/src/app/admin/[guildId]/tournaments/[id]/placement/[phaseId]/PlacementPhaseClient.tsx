"use client";

import { useState } from "react";
import { getBotApiUrl } from '@/utils/api';

import { useRouter } from "next/navigation";
import {
  Lock,
  Plus,
  Search,
  Trash2,
  Maximize2,
  Users,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Helper for bracket visually formatting the first round
const BRACKET_PAIRS: Record<number, number[][]> = {
  2: [[0, 1]],
  4: [
    [0, 3],
    [1, 2],
  ],
  8: [
    [0, 7],
    [3, 4],
    [1, 6],
    [2, 5],
  ],
  16: [
    [0, 15],
    [7, 8],
    [3, 12],
    [4, 11],
    [1, 14],
    [6, 9],
    [2, 13],
    [5, 10],
  ],
  32: [
    [0, 31],
    [15, 16],
    [7, 24],
    [8, 23],
    [3, 28],
    [12, 19],
    [4, 27],
    [11, 20],
    [1, 30],
    [14, 17],
    [6, 25],
    [9, 22],
    [2, 29],
    [13, 18],
    [5, 26],
    [10, 21],
  ],
};

export function PlacementPhaseClient({
  tournamentId,
  guildId,
  phase,
  availableTeams,
  initialPhaseTeams,
}: {
  tournamentId: string;
  guildId: string;
  phase: any;
  availableTeams: any[];
  initialPhaseTeams: any[];
}) {
  const router = useRouter();

  const isGroups = phase.format === "ROUND_ROBIN";
  // The total number of slots
  const totalSlots = isGroups ? availableTeams.length : phase.bracket_size || 8;

  // seeds state: array where index + 1 = seed number. Value = team object or null.
  const [seeds, setSeeds] = useState<(any | null)[]>(() => {
    const array = new Array(totalSlots).fill(null);
    initialPhaseTeams.forEach((pt) => {
      // seed is 1-indexed
      const zeroIndex = pt.seed - 1;
      if (zeroIndex >= 0 && zeroIndex < array.length) {
        array[zeroIndex] = pt.teams;
      }
    });
    return array;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<number | null>(null); // 1-indexed
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Computed state for modal
  const assignedTeamIds = seeds.filter((t) => t !== null).map((t) => t.id);
  const unassignedTeams = availableTeams.filter(
    (t) => !assignedTeamIds.includes(t.id),
  );
  const filteredTeams = unassignedTeams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handlers
  const handleOpenModal = (slotNum: number) => {
    setTargetSlot(slotNum);
    setSelectedTeamId(null);
    setSearchQuery("");
    setModalOpen(true);
  };
  const handleAutoFill = () => {
    let unplacedTeams = availableTeams.filter(
      (t) => !seeds.some((s) => s?.id === t.id),
    );
    if (unplacedTeams.length === 0) {
      alert("Plus aucune �quipe disponible � placer.");
      return;
    }
    const newSeeds = [...seeds];
    for (let i = 0; i < totalSlots; i++) {
      if (!newSeeds[i] && unplacedTeams.length > 0) {
        newSeeds[i] = unplacedTeams.shift() || null;
      }
    }
    setSeeds(newSeeds);
  };
  const handleRemoveFromSlot = (index: number) => {
    const newSeeds = [...seeds];
    newSeeds[index] = null;
    setSeeds(newSeeds);
  };

  const handleConfirmSelection = () => {
    if (!targetSlot || !selectedTeamId) return;
    const team = availableTeams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    const newSeeds = [...seeds];
    const zeroIndex = targetSlot - 1;
    // Swap back if picking a team that somehow got assigned while modal open (rare), but just in case
    newSeeds[zeroIndex] = team;
    setSeeds(newSeeds);
    setModalOpen(false);
  };

  const handleSaveSeeding = async () => {
    if (
      !confirm(
        "Sauvegarder le placement pour cette phase ? Cela régénérera les matchs associés.",
      )
    )
      return;
    setIsSaving(true);

    // Construct payload
    const participants = seeds
      .map((team, index) =>
        team ? { team_id: team.id, seed: index + 1 } : null,
      )
      .filter((t) => t !== null);

    try {
      const res = await fetch(
        `${getBotApiUrl()}/api/phases/${phase.id}/seeding`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participants }),
        },
      );

      if (!res.ok) { let b={error: "Erreur de sauvegarde"}; try { b = await res.json(); } catch(e){} throw new Error(b.error || "Erreur de sauvegarde"); }
      alert("Placement enregistré avec succès !");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Erreur: " + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  // --- Rendering UI Helpers ---

  // Renders a single slot generically
  const renderSlot = (slotNum: number, small = false) => {
    const team = seeds[slotNum - 1];

    if (!team) {
      return (
        <div
          onClick={() => handleOpenModal(slotNum)}
          className={`flex items-center gap-2 ${small ? "p-1.5" : "p-2.5"} cursor-pointer hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group rounded`}
        >
          <div className="flex-shrink-0 text-green-500 font-bold group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4" strokeWidth={3} />
          </div>
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            Empty
          </span>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center justify-between ${small ? "p-1.5" : "p-2.5"} border border-slate-200 shadow-sm bg-white rounded group`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex-shrink-0 w-5 text-center text-xs font-bold text-slate-400">
            (#{slotNum})
          </div>
          <span className="text-slate-800 text-sm font-bold truncate">
            {team.name}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFromSlot(slotNum - 1);
            }}
            className="text-slate-300 hover:text-red-500 p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="text-slate-300 p-1">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    );
  };

  // Groups Render
  const renderRightGroups = () => {
    const groupCount = phase.max_groups || 1;
    const groups: number[][] = Array.from({ length: groupCount }, () => []);

    // Snake seeding distribution
    for (let i = 0; i < totalSlots; i++) {
      const seed = i + 1; // 1-indexed
      let groupIndex = i % groupCount; // Standard round robin distribution

      // Basic snake draft direction
      const round = Math.floor(i / groupCount);
      if (round % 2 === 1) {
        groupIndex = groupCount - 1 - groupIndex;
      }

      groups[groupIndex].push(seed);
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-max">
        {groups.map((groupSeeds, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden"
          >
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 font-bold text-slate-800 text-sm">
              Group {idx + 1}
            </div>
            <div className="p-2 flex flex-col gap-1.5">
              {groupSeeds.map((seedNum) => (
                <div key={seedNum}>{renderSlot(seedNum, true)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Bracket Render
  const renderRightBracket = () => {
    const pairs = BRACKET_PAIRS[totalSlots];
    if (!pairs) {
      return (
        <div className="text-slate-400 p-8 text-center bg-slate-900 rounded-xl border border-slate-800">
          Aucun format d'arbre disponible pour cette taille ({totalSlots}).
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-[400px] overflow-x-auto flex">
        <div className="flex flex-col justify-around gap-6 py-4 w-64 flex-shrink-0">
          <h3 className="text-center font-bold text-slate-400 text-xs mb-4 uppercase tracking-wider">
            Round 1
          </h3>

          {pairs.map((pair, idx) => {
            const seedA = pair[0] + 1;
            const seedB = pair[1] + 1;

            return (
              <div key={idx} className="relative">
                {/* Visual connecting lines to right */}
                <div className="absolute right-[-1.5rem] top-1/4 bottom-1/4 w-6 border-r-2 border-y-2 border-slate-200 rounded-r-lg z-0" />

                <div className="bg-white border text-sm text-slate-700 border-slate-200 rounded shadow-sm relative z-10 flex flex-col overflow-hidden">
                  <div className="border-b border-slate-100 flex items-stretch h-10 w-full relative">
                    {!seeds[seedA - 1] ? (
                      <button
                        onClick={() => handleOpenModal(seedA)}
                        className="flex-1 px-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group h-full"
                      >
                        <span className="text-slate-400 font-medium text-xs">
                          Empty (Seed {seedA})
                        </span>
                        <Plus
                          className="w-3.5 h-3.5 text-green-500 opacity-0 group-hover:opacity-100"
                          strokeWidth={3}
                        />
                      </button>
                    ) : (
                      <div className="flex-1 px-3 flex items-center justify-between bg-white group h-full">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-slate-400 text-xs font-bold">
                            (#{seedA})
                          </span>
                          <span className="font-bold truncate text-sm">
                            {seeds[seedA - 1].name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromSlot(seedA - 1)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                      <Lock className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex items-stretch h-10 w-full relative">
                    {!seeds[seedB - 1] ? (
                      <button
                        onClick={() => handleOpenModal(seedB)}
                        className="flex-1 px-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group h-full"
                      >
                        <span className="text-slate-400 font-medium text-xs">
                          Empty (Seed {seedB})
                        </span>
                        <Plus
                          className="w-3.5 h-3.5 text-green-500 opacity-0 group-hover:opacity-100"
                          strokeWidth={3}
                        />
                      </button>
                    ) : (
                      <div className="flex-1 px-3 flex items-center justify-between bg-white group h-full">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-slate-400 text-xs font-bold">
                            (#{seedB})
                          </span>
                          <span className="font-bold truncate text-sm">
                            {seeds[seedB - 1].name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromSlot(seedB - 1)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                      <Lock className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Placeholder for Next round */}
        <div className="flex flex-col justify-around py-4 w-64 ml-12 opacity-50 relative pointer-events-none">
          <h3 className="text-center font-bold text-slate-400 text-xs mb-4 uppercase tracking-wider">
            Round 2
          </h3>
          {Array.from({ length: pairs.length / 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border text-sm text-slate-400 border-slate-200 rounded shadow-sm relative z-10 flex flex-col h-[81px] overflow-hidden"
            >
              <div className="border-b border-slate-100 flex-1 px-3 flex items-center bg-slate-50">
                TBD
              </div>
              <div className="flex-1 px-3 flex items-center bg-slate-50">
                TBD
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* LEFT COLUMN: Roster */}
        <div className="col-span-12 lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[50vh] lg:h-[calc(100vh-12rem)] shrink-0 lg:shrink">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Participants
            </h2>
            <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded">
              {seeds.filter((s) => s !== null).length} / {totalSlots}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {Array.from({ length: totalSlots }).map((_, index) => {
              const seedNum = index + 1;
              const team = seeds[index];

              return (
                <div
                  key={seedNum}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    team
                      ? "bg-slate-800 border-slate-700"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700 border-dashed cursor-pointer"
                  }`}
                  onClick={() => !team && handleOpenModal(seedNum)}
                >
                  <div className="w-6 text-center text-slate-500 font-bold text-sm shrink-0">
                    {seedNum}
                  </div>

                  {team ? (
                    <>
                      <div className="flex-1 font-semibold text-slate-200 truncate pr-2">
                        {team.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromSlot(index);
                        }}
                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center justify-between opacity-50 group">
                        <span className="text-slate-400 font-medium text-sm">
                          Vide...
                        </span>
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-green-500 flex items-center justify-center border border-slate-700 group-hover:bg-green-500/20 group-hover:text-green-400 transition-colors">
                          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/80 shrink-0 backdrop-blur flex flex-col gap-2">
            <button
              onClick={handleAutoFill}
              className="w-full h-10 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              ?? Remplissage Automatique
            </button>
            <button
              onClick={handleSaveSeeding}
              disabled={isSaving}
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "? Enregistrer le seeding"
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Visual Preview */}
        <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[50vh] lg:h-[calc(100vh-12rem)] shrink-0 lg:shrink">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50 shrink-0 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-slate-400" />
              Aperçu{" "}
              <span className="opacity-50 font-normal">
                ({isGroups ? "Groupes" : "�limination directe"})
              </span>
            </h2>
          </div>

          {/* Use light background for Right Column content specifically (per Toornament styling) */}
          <div className="p-6 md:p-8 flex-1 overflow-auto bg-slate-100">
            {isGroups ? renderRightGroups() : renderRightBracket()}
          </div>
        </div>
      </div>

      {/* SELECTION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="border-b border-slate-200 px-6 py-5 bg-white shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                S�lectionnez un participant pour le seed {targetSlot}
              </h2>
            </div>

            {/* Modal Controls */}
            <div className="px-6 pt-5 pb-2 shrink-0 flex gap-4 items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-slate-900 transition-colors"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="text-sm font-medium border border-slate-300 bg-slate-50 px-4 py-2 rounded-md text-slate-600 flex items-center gap-2">
                Participants sortants
              </div>
            </div>

            <div className="px-6 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dispo"
                  checked
                  readOnly
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
                <label
                  htmlFor="dispo"
                  className="text-sm font-semibold text-slate-700"
                >
                  Disponible ({unassignedTeams.length})
                </label>
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto bg-slate-50 border-t border-b border-slate-200 custom-scrollbar">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-blue-500 uppercase tracking-wider w-12"
                    ></th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-blue-500 uppercase tracking-wider"
                    >
                      Nom
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-semibold text-blue-500 uppercase tracking-wider"
                    >
                      Date de cr�ation
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-semibold text-blue-500 uppercase tracking-wider"
                    >
                      Seed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredTeams.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        Aucun participant trouv�.
                      </td>
                    </tr>
                  ) : (
                    filteredTeams.map((team) => (
                      <tr
                        key={team.id}
                        onClick={() => setSelectedTeamId(team.id)}
                        className={`cursor-pointer transition-colors ${selectedTeamId === team.id ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-slate-50 border-l-4 border-l-transparent"}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="radio"
                            checked={selectedTeamId === team.id}
                            onChange={() => setSelectedTeamId(team.id)}
                            className="w-4 h-4 text-blue-600 accent-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">
                          {team.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                          {new Date(team.created_at).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-center font-mono">
                          -
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-100 flex items-center justify-between shrink-0 border-t border-slate-200">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-2.5 bg-slate-500 hover:bg-slate-600 text-white rounded font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={!selectedTeamId}
                className="px-8 py-2.5 bg-green-500 hover:bg-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed text-white rounded font-bold shadow-sm transition-all"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
