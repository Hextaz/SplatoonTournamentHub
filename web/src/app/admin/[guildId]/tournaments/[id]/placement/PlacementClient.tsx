"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Save, Rocket, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function PlacementClient({ tournamentId, guildId, phase, availableTeams }: any) {
  const router = useRouter();
  const [seeds, setSeeds] = useState<any[]>([]);
  const [unassignedTeams, setUnassignedTeams] = useState<any[]>(availableTeams);
  const [isSaving, setIsSaving] = useState(false);

  const bracketSize = phase.bracket_size || 8;

  // Initial load
  useEffect(() => {
    const fetchExistingSeeding = async () => {
      const { data } = await supabase
        .from('phase_teams')
        .select('team_id, seed, teams(*)')
        .eq('phase_id', phase.id)
        .order('seed', { ascending: true });

      if (data && data.length > 0) {
        // We have existing seeding
        const seededIds = data.map(d => d.team_id);
        setUnassignedTeams(availableTeams.filter((t: any) => !seededIds.includes(t.id)));

        // Create the seeded array
        const loadedSeeds = Array.from({ length: bracketSize }, (_, i) => {
          const s = data.find(d => d.seed === i + 1);
          return s ? s.teams : null;
        });
        setSeeds(loadedSeeds);
      } else {
        // Initialize empty seeds
        setSeeds(Array(bracketSize).fill(null));
        setUnassignedTeams(availableTeams);
      }
    };
    fetchExistingSeeding();
  }, [phase.id, availableTeams, bracketSize]);

  const onDragEnd = (result: any) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.droppableId === 'unassigned') {
      const newUnassigned = Array.from(unassignedTeams);
      const [reorderedItem] = newUnassigned.splice(source.index, 1);
      newUnassigned.splice(destination.index, 0, reorderedItem);
      setUnassignedTeams(newUnassigned);
      return;
    }

    if (source.droppableId === destination.droppableId && source.droppableId === 'seeds') {
      const newSeeds = Array.from(seeds);
      const temp = newSeeds[source.index];
      newSeeds[source.index] = newSeeds[destination.index];
      newSeeds[destination.index] = temp;
      setSeeds(newSeeds);
      return;
    }

    if (source.droppableId === 'unassigned' && destination.droppableId === 'seeds') {
      const newUnassigned = Array.from(unassignedTeams);
      const newSeeds = Array.from(seeds);
      
      const targetExisting = newSeeds[destination.index];
      const [movedTeam] = newUnassigned.splice(source.index, 1);
      
      if (targetExisting) {
        newUnassigned.push(targetExisting);
      }
      newSeeds[destination.index] = movedTeam;
      
      setUnassignedTeams(newUnassigned);
      setSeeds(newSeeds);
      return;
    }

    if (source.droppableId === 'seeds' && destination.droppableId === 'unassigned') {
      const newUnassigned = Array.from(unassignedTeams);
      const newSeeds = Array.from(seeds);
      
      const movedTeam = newSeeds[source.index];
      if (movedTeam) {
        newUnassigned.splice(destination.index, 0, movedTeam);
        newSeeds[source.index] = null;
        setUnassignedTeams(newUnassigned);
        setSeeds(newSeeds);
      }
    }
  };

  const handleSaveSeeding = async () => {
    setIsSaving(true);
    try {
      const payloadParticipants = seeds
        .map((team, idx) => team ? { team_id: team.id, seed: idx + 1 } : null)
        .filter(t => t !== null);

      const res = await fetch(`http://localhost:8080/api/phases/${phase.id}/seeding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: payloadParticipants })
      });

      if (!res.ok) throw new Error("Erreur de sauvegarde backend");
      
      alert("Seeding sauvegardé avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helpers to get visual matchmaking for the preview tree.
  // Standard tree fold (e.g. 1vs8, 4vs5, 2vs7, 3vs6)
  const getSimulatedMatchings = () => {
     if (bracketSize === 4) return [[0,3], [1,2]];
     if (bracketSize === 8) return [[0,7], [3,4], [1,6], [2,5]];
     if (bracketSize === 16) return [[0,15], [7,8], [3,12], [4,11], [1,14], [6,9], [2,13], [5,10]];
     return []; // fallback for 32/64 display
  };

  const simulMatches = getSimulatedMatchings();

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left Sidebar: Unassigned and Actions */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
             <h3 className="text-white font-bold text-lg mb-4 flex items-center justify-between">
                Disponibles 
                <span className="text-sm bg-slate-700 px-2 py-1 rounded text-slate-300">
                  {unassignedTeams.length} équipes
                </span>
             </h3>
             <Droppable droppableId="unassigned">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="min-h-[200px] flex flex-col gap-2 p-2 bg-slate-900/50 rounded-lg border border-dashed border-slate-600"
                  >
                    {unassignedTeams.length === 0 && (
                      <p className="text-center text-slate-500 my-auto text-sm">Aucune équipe en attente</p>
                    )}
                    {unassignedTeams.map((team, index) => (
                      <Draggable key={team.id} draggableId={team.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 rounded-lg flex items-center gap-3 text-sm font-bold shadow-md transition-colors ${
                               snapshot.isDragging ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            }`}
                          >
                             <GripVertical className="w-4 h-4 opacity-50" />
                             {team.name}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
             </Droppable>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-3 shadow-xl">
            <button 
               onClick={handleSaveSeeding}
               disabled={isSaving}
               className="flex items-center justify-center gap-2 w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all disabled:opacity-50"
            >
               {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-blue-400" />}
               💾 Enregistrer le Placement
            </button>
          </div>
        </div>

        {/* Right Main Content: Seedings & Visual Bracket */}
        <div className="col-span-1 lg:col-span-8 flex flex-col xl:flex-row gap-6">
          
          {/* Seeding Slots */}
          <div className="flex-1 bg-slate-800/80 p-6 rounded-xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
             <h3 className="text-white font-bold text-lg mb-4 flex items-center justify-between">
                Roster initial ({bracketSize} places)
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2 py-1 rounded flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Drag & Drop actif
                </span>
             </h3>
             <Droppable droppableId="seeds">
                {(provided) => (
                  <div 
                     {...provided.droppableProps} 
                     ref={provided.innerRef}
                     className="flex-1 overflow-y-auto pr-2 space-y-2"
                  >
                     {seeds.map((team, index) => (
                        <Draggable key={`seed-${index}`} draggableId={team ? team.id : `empty-${index}`} index={index}>
                           {(provided, snapshot) => (
                              <div
                                 ref={provided.innerRef}
                                 {...provided.draggableProps}
                                 {...provided.dragHandleProps}
                                 className={`flex items-center gap-3 p-3 rounded-lg border shadow-sm transition-colors ${
                                    snapshot.isDragging ? 'bg-blue-600 border-blue-500 z-50' : 
                                    team ? 'bg-slate-800 border-slate-600 shadow-md hover:border-slate-500 text-white' : 
                                    'bg-slate-900/50 border-dashed border-slate-700 text-slate-500'
                                 }`}
                              >
                                 <span className="w-8 h-8 flex items-center justify-center font-bold font-mono text-sm bg-slate-900 rounded-md border border-slate-700 shadow-inner">
                                   #{index + 1}
                                 </span>
                                 {team ? (
                                   <span className="font-bold flex-1">{team.name}</span>
                                 ) : (
                                   <span className="italic flex-1 text-sm">Vide (BYE)</span>
                                 )}
                                 <GripVertical className="w-4 h-4 opacity-30 ml-auto" />
                              </div>
                           )}
                        </Draggable>
                     ))}
                     {provided.placeholder}
                  </div>
                )}
             </Droppable>
          </div>

          {/* Visual Preview (Desktop only for space reasons) */}
          <div className="hidden xl:flex flex-1 bg-slate-900 p-6 rounded-xl border border-slate-800 flex-col items-center justify-center relative overflow-hidden">
             <h3 className="text-white font-bold opacity-30 absolute top-6 left-6 uppercase tracking-widest text-sm">Preview Round 1</h3>
             
             <div className="w-full space-y-4">
                {simulMatches.map((pair, idx) => {
                   const t1 = seeds[pair[0]];
                   const t2 = seeds[pair[1]];
                   return (
                     <div key={idx} className="bg-slate-800 rounded border border-slate-700 shadow flex flex-col text-sm w-full divide-y divide-slate-700">
                        <div className="p-2.5 flex justify-between items-center text-slate-300 relative overflow-hidden">
                           {t1 ? <span className="font-bold truncate z-10">{t1.name}</span> : <span className="text-slate-500 italic z-10">(BYE)</span>}
                           <span className="opacity-50 text-xs font-mono ml-2 z-10 w-4">#{pair[0]+1}</span>
                        </div>
                        <div className="p-2.5 flex justify-between items-center text-slate-300 relative overflow-hidden">
                           {t2 ? <span className="font-bold truncate z-10">{t2.name}</span> : <span className="text-slate-500 italic z-10">(BYE)</span>}
                           <span className="opacity-50 text-xs font-mono ml-2 z-10 w-4">#{pair[1]+1}</span>
                        </div>
                     </div>
                   );
                })}
                {simulMatches.length === 0 && (
                   <div className="text-slate-600 italic text-center p-4 border border-slate-800 rounded bg-slate-900/50">
                      Preview non générée pour &gt; 16
                   </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </DragDropContext>
  );
}