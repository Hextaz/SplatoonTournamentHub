"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Users, Target, Rocket, Loader2, GripVertical, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Define strict team types matching supabase structure
type Team = {
  id: string;
  name: string;
  is_checked_in: boolean;
};

export function PhaseManager({
  tournamentId,
  phaseId,
  initialTeams,
}: {
  tournamentId: string;
  phaseId: string;
  initialTeams: Team[];
}) {
  const router = useRouter();

  // State arrays for drag & drop columns
  const [bank, setBank] = useState<Team[]>(initialTeams || []); // Unseeded teams
  const [seeded, setSeeded] = useState<Team[]>([]); // Teams placed for bracket building

  // Mutation UI state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Business Rules for '🚀 Publier la Phase'
  const isReadyToPublish = bank.length === 0 && seeded.length > 1;

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      // Reordering within same column
      const items = Array.from(source.droppableId === "bank" ? bank : seeded);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      if (source.droppableId === "bank") {
        setBank(items);
      } else {
        setSeeded(items);
      }
    } else {
      // Cross-column movement
      const sourceItems = Array.from(source.droppableId === "bank" ? bank : seeded);
      const destItems = Array.from(destination.droppableId === "bank" ? bank : seeded);

      const [movedItem] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, movedItem);

      if (source.droppableId === "bank") {
        setBank(sourceItems);
        setSeeded(destItems);
      } else {
        setSeeded(sourceItems);
        setBank(destItems);
      }
    }
  };

  const handlePublish = async () => {
    if (!isReadyToPublish) return;
    setIsPublishing(true);
    setPublishSuccess(false);

    try {
      // Appel API pour générer la phase / bracket en BDD
      // Envoi du tableau séquentiel des IDs ('seeded')
      const res = await fetch(`/api/phases/${phaseId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tournamentId,
          seededTeams: seeded.map(t => t.id)
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur de publication");
      }

      setPublishSuccess(true);
      router.refresh(); // Refresh page to update data globally

    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la génération de l'arbre.");
    } finally {
      setIsPublishing(false);
      // Wait 3s then hide success toast if needed
      setTimeout(() => setPublishSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      
      {/* DRAG & DROP ARENA */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* BANQUE COLUMN */}
          <div className="flex-1 bg-slate-900 border border-slate-700/50 rounded-2xl flex flex-col shadow-lg min-h-[400px]">
            <div className="bg-slate-800 p-4 border-b border-slate-700 rounded-t-2xl flex justify-between items-center z-10 shrink-0">
              <h3 className="font-bold flex items-center text-slate-300 gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Banque d'équipes
              </h3>
              <span className="text-xs bg-slate-700 text-white font-bold px-2 py-1 rounded-full">
                {bank.length}
              </span>
            </div>
            
            <Droppable droppableId="bank">
              {(provided, snapshot) => (
                <div 
                  className={`flex-1 p-4 overflow-y-auto space-y-3 transition-colors rounded-b-2xl ${
                    snapshot.isDraggingOver ? "bg-slate-800/50" : ""
                  }`}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {bank.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex flex-col items-center justify-center text-slate-500 h-full">
                      <p>Toutes les équipes sont placées</p>
                    </div>
                  )}
                  {bank.map((team, index) => (
                    <Draggable key={team.id} draggableId={team.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-slate-800 border ${
                            snapshot.isDragging ? "border-blue-500 shadow-xl scale-105" : "border-slate-600"
                          } rounded-xl p-3 flex items-center justify-between text-slate-200 transition-all select-none`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <span className="text-slate-500 cursor-grab active:cursor-grabbing hover:text-slate-300 p-1">
                              <GripVertical className="w-5 h-5" />
                            </span>
                            <span className="font-medium truncate pr-4">{team.name}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* SEEDING COLUMN */}
          <div className="flex-1 bg-slate-900 border border-slate-700/50 rounded-2xl flex flex-col shadow-lg min-h-[400px]">
            <div className="bg-slate-800 p-4 border-b border-slate-700 rounded-t-2xl flex justify-between items-center z-10 shrink-0">
              <h3 className="font-bold flex items-center text-slate-300 gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Seeding & Bracket
              </h3>
              <span className="text-xs bg-slate-700 text-white font-bold px-2 py-1 rounded-full">
                {seeded.length}
              </span>
            </div>
            
            <Droppable droppableId="seeded">
              {(provided, snapshot) => (
                <div 
                  className={`flex-1 p-4 overflow-y-auto space-y-3 transition-colors relative rounded-b-2xl ${
                    snapshot.isDraggingOver ? "bg-slate-800/50" : ""
                  }`}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {seeded.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex flex-col items-center justify-center text-slate-500 h-full">
                      <Target className="w-12 h-12 mb-3 opacity-20" />
                      <p>Glissez-déposez les équipes ici pour le seeding initial</p>
                    </div>
                  )}

                  {seeded.map((team, index) => (
                    <Draggable key={team.id} draggableId={team.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-slate-800 border ${
                            snapshot.isDragging ? "border-green-500 shadow-xl scale-105" : "border-slate-600"
                          } rounded-xl p-3 flex items-center justify-between text-slate-200 transition-all select-none`}
                        >
                          <div className="flex items-center gap-3 w-full relative">
                            {/* Seed Rank Bubble */}
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-slate-700 font-bold text-sm text-green-400 cursor-grab active:cursor-grabbing">
                              #{index + 1}
                            </div>
                            <span className="font-bold truncate pr-4">{team.name}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

        </div>
      </DragDropContext>

      {/* CORE REACTOR FIRE BUTTON */}
      <div className="flex flex-col items-center justify-center py-8">
        
        {/* Helper rule text */}
        {!isReadyToPublish && (
          <p className="text-yellow-500 text-sm mb-4 font-medium max-w-md text-center">
            ⚠ Toutes les équipes doivent être classées dans la colonne de Seeding avant de générer l'arbre.
          </p>
        )}

        {publishSuccess && (
          <div className="mb-4 bg-green-900/30 border border-green-800 text-green-400 font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-in slide-in-from-bottom-2 fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            L'arbre a été généré avec succès ! 
          </div>
        )}

        <button 
          onClick={handlePublish}
          disabled={!isReadyToPublish || isPublishing}
          className={`
            relative group flex items-center justify-center gap-3 px-12 py-5 rounded-2xl font-extrabold text-xl transition-all shadow-xl
            ${!isReadyToPublish 
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-60" 
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:-translate-y-1"
            }
          `}
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Génération des Matchs...
            </>
          ) : (
            <>
              <Rocket className={`w-7 h-7 transition-transform ${isReadyToPublish ? "group-hover:-translate-y-1" : ""}`} />
              🚀 Publier la Phase
            </>
          )}
        </button>
      </div>

    </div>
  );
}
