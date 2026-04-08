"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Users, Target, Rocket, Loader2, GripVertical, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Define strict team types matching supabaase structure
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
}"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface PhaseManagerProps {
  tournamentId: string;
}

export default function PhaseManager({ tournamentId }: PhaseManagerProps) {
  const [phases, setPhases] = useState<any[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  
  // Drag and Drop states
  const [unseededTeams, setUnseededTeams] = useState<any[]>([]);
  const [seededTeams, setSeededTeams] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Create phase logic
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseFormat, setNewPhaseFormat] = useState("SINGLE_ELIM");

  const apiBase = "http://localhost:8080/api/phases";

  useEffect(() => {
    setIsMounted(true);
    fetchPhases();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedPhase && selectedPhase.status === "DRAFT") {
      fetchTeamsForSeeding();
    }
  }, [selectedPhase]);

  const fetchPhases = async () => {
    const res = await fetch(`${apiBase}/${tournamentId}`);
    if (res.ok) {
      const data = await res.json();
      setPhases(data);
    }
  };

  const createPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    const phaseOrder = phases.length + 1;
    
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournament_id: tournamentId,
        name: newPhaseName,
        format: newPhaseFormat,
        phase_order: phaseOrder
      })
    });
    
    if (res.ok) {
      setNewPhaseName("");
      fetchPhases();
    }
  };

  const fetchTeamsForSeeding = async () => {
    setLoadingConfig(true);
    try {
      // 1. On récupère toutes les équipes "Checked-in" du tournoi
      const { data: checkedInTeams } = await supabase
        .from("teams")
        .select("id, name")
        .eq("tournament_id", tournamentId)
        .eq("is_checked_in", true);

      const allCheckedIn = checkedInTeams || [];

      // 2. On récupère celles déjà placées dans le seeding via l'API
      const res = await fetch(`${apiBase}/${selectedPhase.id}/seeding`);
      let seededFromDB: any[] = [];
      if (res.ok) {
        seededFromDB = await res.json(); // Array de { team_id, seed, teams: { id, name } }
      }

      // Convertir le format renvoyé par l'API pour l'interface DnD
      const seeded = seededFromDB.map((p) => ({
        id: p.team_id,
        name: p.teams?.name || "Équipe Inconnue"
      }));

      // Les équipes non seedées sont celles du check-in absentes de la liste "seeded"
      const unseeded = allCheckedIn.filter(
        (team) => !seeded.find((s) => s.id === team.id)
      );

      setSeededTeams(seeded);
      setUnseededTeams(unseeded);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return; // Drop en dehors des listes
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Clonage des listes
    const sourceList = source.droppableId === "unseeded" ? [...unseededTeams] : [...seededTeams];
    const destList = destination.droppableId === "unseeded" ? [...unseededTeams] : [...seededTeams];

    const [movedItem] = sourceList.splice(source.index, 1);
    destList.splice(destination.index, 0, movedItem);

    // Mettre à jour les bons states
    if (source.droppableId === "unseeded") {
      if (destination.droppableId === "unseeded") {
        setUnseededTeams(destList);
      } else {
        setUnseededTeams(sourceList);
        setSeededTeams(destList);
      }
    } else {
      if (destination.droppableId === "seeded") {
        setSeededTeams(destList);
      } else {
        setSeededTeams(sourceList);
        setUnseededTeams(destList);
      }
    }
  };

  const saveSeeding = async () => {
    setIsSaving(true);
    // Le seed_rank = Index du tableau (1-indexed)
    const participants = seededTeams.map((team, index) => ({
      team_id: team.id,
      seed: index + 1 // ex: 1, 2, 3...
    }));

    try {
      const res = await fetch(`${apiBase}/${selectedPhase.id}/seeding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants })
      });

      if (res.ok) {
        alert("💾 Seeding sauvegardé avec succès !");
      } else {
        alert("Erreur lors de la sauvegarde du seeding.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const publishPhase = async () => {
    if (unseededTeams.length > 0) {
      alert("Impossible de publier : Règle stricte : la réserve doit être vide (toutes les équipes Check-in doivent être classées).");
      return;
    }
    if (seededTeams.length < 2) {
      alert("Impossible de publier : il faut au moins 2 équipes.");
      return;
    }
    if (!confirm(`Toutes les équipes sont seedées. Vous allez GÉNÉRER les matchs et bloquer cette phase. Continuer ?`)) return;

    try {
      const res = await fetch(`${apiBase}/${selectedPhase.id}/publish`, {
        method: "POST"
      });

      if (res.ok) {
        alert("🚀 Phase Publiée ! L'arbre du tournoi va être généré (prochaine étape).");
        setSelectedPhase(null);
        fetchPhases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isMounted) return null; // Hydration safe

  return (
    <div className="mt-8 border-t-2 border-gray-200 pt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Gestion des Phases</h2>
      
      {/* SECTION 1 : Liste/Création des Phases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 bg-white p-5 rounded-lg shadow border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Nouvelle Phase</h3>
          <form onSubmit={createPhase} className="space-y-3">
            <input 
              type="text" 
              required 
              placeholder="Ex: Playoff Top 8" 
              className="w-full border p-2 shadow-sm rounded text-sm focus:ring-purple-500 focus:border-purple-500"
              value={newPhaseName} 
              onChange={e => setNewPhaseName(e.target.value)} 
            />
            <select 
              className="w-full border p-2 shadow-sm rounded text-sm focus:ring-purple-500 focus:border-purple-500"
              value={newPhaseFormat}
              onChange={e => setNewPhaseFormat(e.target.value)}
            >
              <option value="SINGLE_ELIM">Arbre Simple (Single Elim)</option>
              <option value="DOUBLE_ELIM">Arbre Double (Double Elim)</option>
              <option value="ROUND_ROBIN">Poules (Round Robin)</option>
              <option value="SWISS">Ronde Suisse (Swiss)</option>
            </select>
            <button className="w-full bg-purple-600 text-white font-medium py-2 rounded shadow hover:bg-purple-700 transition">
              Créer la Phase (Brouillon)
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-5 rounded-lg shadow border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Phases du Tournoi</h3>
          {phases.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Aucune phase configurée.</p>
          ) : (
            <div className="space-y-2">
              {phases.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                  <div>
                    <span className="font-bold text-gray-800 mr-2">Phase {p.phase_order} : {p.name}</span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-600">{p.format}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-2 py-1 font-bold rounded ${p.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.status}
                    </span>
                    {p.status === 'DRAFT' && (
                      <button 
                        onClick={() => setSelectedPhase(p)}
                        className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded font-medium hover:bg-blue-200 transition"
                      >
                        Éditer Seeding
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2 : Interface de Seeding (Drag & Drop) */}
      {selectedPhase && selectedPhase.status === 'DRAFT' && (
        <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-blue-400">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Seeding : {selectedPhase.name}</h3>
              <p className="text-sm text-gray-500 font-medium">Glissez les équipes de la banque vers le classement à droite.</p>
            </div>
            <button onClick={() => setSelectedPhase(null)} className="text-gray-500 hover:text-gray-800">
              ✖ Fermer
            </button>
          </div>

          {loadingConfig ? (
            <p className="text-center p-10 animate-pulse text-gray-500 font-medium">Chargement des équipes Check-in...</p>
          ) : (
            <>
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* COLONNE 1 : BANQUE (NON SEEDÉS) */}
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-3 flex justify-between">
                      🏦 Banque (Non-classées)
                      <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{unseededTeams.length}</span>
                    </h4>
                    <Droppable droppableId="unseeded">
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className={`min-h-[200px] border-2 border-dashed rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
                        >
                          {unseededTeams.map((team, index) => (
                            <Draggable key={team.id} draggableId={team.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 mb-2 rounded shadow-sm border border-gray-200 flex items-center justify-between ${snapshot.isDragging ? 'bg-blue-100 shadow-lg' : 'bg-white'}`}
                                >
                                  <span className="font-medium text-gray-800">{team.name}</span>
                                  <span className="text-gray-400 cursor-grab">⣿</span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {unseededTeams.length === 0 && (
                            <div className="text-center text-sm text-gray-400 py-10 italic">
                              Toutes les équipes sont classées ! 🎉
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  {/* COLONNE 2 : CLASSEMENT (SEEDÉS) */}
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3 flex justify-between">
                      🏆 Ordre de Seeding
                      <span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full">{seededTeams.length}</span>
                    </h4>
                    <Droppable droppableId="seeded">
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className={`min-h-[200px] border-2 border-dashed rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-white border-blue-400 shadow-inner' : 'border-blue-300'}`}
                        >
                          {seededTeams.map((team, index) => (
                            <Draggable key={team.id} draggableId={team.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 mb-2 rounded shadow border border-blue-200 flex items-center gap-3 ${snapshot.isDragging ? 'bg-blue-600 text-white' : 'bg-white'}`}
                                >
                                  {/* Pastille de Seed (Or/Argent/Bronze ou Grise) */}
                                  <div className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm shadow-inner shrink-0 ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-300 text-gray-800' : index === 2 ? 'bg-orange-300 text-orange-900' : 'bg-gray-100 text-gray-600'}`}>
                                    #{index + 1}
                                  </div>
                                  
                                  <span className={`font-bold truncate flex-1 ${snapshot.isDragging ? 'text-white' : 'text-gray-900'}`}>
                                    {team.name}
                                  </span>
                                  <span className={snapshot.isDragging ? "text-blue-200" : "text-gray-300"}>⣿</span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {seededTeams.length === 0 && (
                            <div className="text-center text-sm text-blue-400 py-10 italic font-medium">
                              Glissez une équipe ici pour définir le Seed #1
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              </DragDropContext>

              {/* ACTIONS */}
              <div className="mt-8 flex items-center justify-end gap-4 border-t border-gray-200 pt-5">
                <button
                  onClick={saveSeeding}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-100 text-blue-700 font-bold rounded shadow hover:bg-blue-200 disabled:opacity-50 transition"
                >
                  {isSaving ? "..." : "💾 Sauvegarder le Seeding"}
                </button>
                
                {/* 🚀 Publication avec validation stricte */}
                <button
                  onClick={publishPhase}
                  disabled={unseededTeams.length > 0 || seededTeams.length < 2}
                  className="px-8 py-2 bg-green-600 text-white font-bold rounded shadow-lg hover:bg-green-700 disabled:opacity-40 disabled:hover:bg-green-600 transition"
                  title={unseededTeams.length > 0 ? "Vous devez classer toutes les équipes d'abord" : ""}
                >
                  🚀 Publier la Phase
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}