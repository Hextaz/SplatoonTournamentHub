"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyX, GitMerge, LayoutGrid, Network, Trash2, CheckCircle2, HelpCircle, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  bracket_size: z.enum(["4", "8", "16", "32", "64"]),
});

type FormValues = z.infer<typeof formSchema>;

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
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Phase Edit/Delete
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const [editPhaseName, setEditPhaseName] = useState("");
  const [editBracketSize, setEditBracketSize] = useState("");
  const [phaseToDelete, setPhaseToDelete] = useState<any>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Main Bracket",
      bracket_size: "8",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:8080/api/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournament_id: tournamentId,
          name: data.name,
          format: "SINGLE_ELIM",
          phase_order: initialPhases.length + 1,
          bracket_size: parseInt(data.bracket_size),
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur de création");
      }

      setSelectedFormat(null);
      reset();
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la création de la phase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePhase = async () => {
    if (!phaseToDelete) return;
    try {
      const { error } = await supabase.from('phases').delete().eq('id', phaseToDelete.id);
      if (error) throw error;
      setPhaseToDelete(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const openEditPhaseModal = (phase: any) => {
    setEditingPhase(phase);
    setEditPhaseName(phase.name);
    setEditBracketSize(phase.bracket_size ? phase.bracket_size.toString() : "8");
  };

  const handleEditPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase) return;
    try {
      const updateData: any = { name: editPhaseName };
      if (editingPhase.status === 'draft') {
        updateData.bracket_size = parseInt(editBracketSize);
      }
      
      const { error } = await supabase.from('phases').update(updateData).eq('id', editingPhase.id);
      if (error) throw error;
      
      setEditingPhase(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la modification de la phase");
    }
  };

  return (
    <div className="space-y-8">
      {/* Existing Phases Section */}
      {initialPhases.length > 0 && (
        <section className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-xl font-bold text-white mb-4">Phases Actuelles</h2>
          <div className="space-y-3">
            {initialPhases.map((phase) => (
              <div 
                key={phase.id} 
                className="flex items-center justify-between bg-slate-800 border border-slate-700 p-4 rounded-lg"
              >
                <div>
                  <h3 className="text-white font-bold text-lg">{phase.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <GitMerge className="w-4 h-4 text-blue-400" />
                      Élimination Directe
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-orange-400" />
                      Taille: {phase.bracket_size || '?'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    phase.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {phase.status === 'PUBLISHED' ? 'PUBLIÉE' : 'BROUILLON'}
                  </span>
                  
                  <div className="flex bg-slate-700/50 rounded-lg overflow-hidden border border-slate-600">
                    <button 
                      onClick={() => openEditPhaseModal(phase)}
                      className="p-2 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors"
                      title="Éditer la phase"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <div className="w-px bg-slate-600"></div>
                    <button 
                      onClick={() => setPhaseToDelete(phase)}
                      className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="Supprimer la phase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Format Selection Grid */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Ajouter une nouvelle phase</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Active Card: Single Elimination */}
          <button 
            type="button"
            onClick={() => setSelectedFormat(selectedFormat === 'single_elimination' ? null : 'single_elimination')}
            className={`flex flex-col items-start p-6 rounded-xl border-2 transition-all text-left ${
              selectedFormat === 'single_elimination' 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-slate-700 bg-slate-800 hover:border-slate-600'
            }`}
          >
            <GitMerge className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Élimination Directe</h3>
            <p className="text-sm text-slate-400">
              Un arbre classique. Les perdants sont immédiatement éliminés.
            </p>
          </button>

          {/* Disabled Cards */}
          <div className="flex flex-col items-start p-6 rounded-xl border-2 border-slate-800 bg-slate-800/50 opacity-60 cursor-not-allowed">
            <div className="w-full flex justify-between items-start mb-3">
              <CopyX className="w-8 h-8 text-slate-500" />
              <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">WIP</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Double Élimination</h3>
            <p className="text-sm text-slate-500">
              Arbre gagnant (Winner Bracket) et arbre perdant (Loser Bracket).
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl border-2 border-slate-800 bg-slate-800/50 opacity-60 cursor-not-allowed">
            <div className="w-full flex justify-between items-start mb-3">
              <LayoutGrid className="w-8 h-8 text-slate-500" />
              <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">Prochainement</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Groupes (Round-Robin)</h3>
            <p className="text-sm text-slate-500">
              Toutes les équipes de la poule s'affrontent.
            </p>
          </div>

          <div className="flex flex-col items-start p-6 rounded-xl border-2 border-slate-800 bg-slate-800/50 opacity-60 cursor-not-allowed">
            <div className="w-full flex justify-between items-start mb-3">
              <Network className="w-8 h-8 text-slate-500" />
              <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded">Prochainement</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Ronde Suisse</h3>
            <p className="text-sm text-slate-500">
              Appariement automatique basé sur les victoires/défaites des tours précédents.
            </p>
          </div>

        </div>
      </section>

      {/* Creation Form for Single Elimination */}
      {selectedFormat === 'single_elimination' && (
        <section className="bg-slate-800 rounded-xl p-6 border border-blue-500/30 shadow-lg animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <GitMerge className="w-6 h-6 text-blue-400" />
            Création : Élimination Directe
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Nom de la phase */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">Nom de la phase</label>
                <input 
                  type="text" 
                  {...register("name")}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
                  placeholder="Ex: Playoffs, Main Bracket..."
                />
                {errors.name && <p className="text-red-400 text-sm">{errors.name.message}</p>}
              </div>

              {/* Taille de l'arbre */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-300">Taille du bracket (Équipes)</label>
                <select 
                  {...register("bracket_size")}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="4">4 participants (Demi-finales directes)</option>
                  <option value="8">8 participants</option>
                  <option value="16">16 participants</option>
                  <option value="32">32 participants</option>
                  <option value="64">64 participants</option>
                </select>
                {errors.bracket_size && <p className="text-red-400 text-sm">{errors.bracket_size.message}</p>}
              </div>

            </div>

            <div className="flex justify-end border-t border-slate-700 pt-6 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Générer l'arbre (Brouillon)
              </button>
            </div>
          </form>
        </section>
      )}
      {/* Modal Edition Phase */}
      {editingPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-700">
            <div className="bg-slate-900 border-b border-slate-700 p-4">
              <h3 className="text-xl font-bold text-white">Éditer la phase</h3>
            </div>
            
            <form onSubmit={handleEditPhase} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400">Nom de la phase</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  value={editPhaseName}
                  onChange={(e) => setEditPhaseName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  Taille du bracket
                  {editingPhase.status !== 'draft' && (
                    <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-normal">Verrouillée</span>
                  )}
                </label>
                <select 
                  className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none ${editingPhase.status !== 'draft' ? "opacity-50 cursor-not-allowed" : "focus:border-blue-500"}`}
                  value={editBracketSize}
                  onChange={(e) => setEditBracketSize(e.target.value)}
                  disabled={editingPhase.status !== 'draft'}
                >
                  <option value="4">4 participants</option>
                  <option value="8">8 participants</option>
                  <option value="16">16 participants</option>
                  <option value="32">32 participants</option>
                  <option value="64">64 participants</option>
                </select>
                {editingPhase.status !== 'draft' && (
                  <p className="text-xs text-slate-500 mt-1">Impossible de modifier la taille d'une phase publiée.</p>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
                <button 
                  type="button" 
                  onClick={() => setEditingPhase(null)}
                  className="px-5 py-2.5 rounded-lg font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={!editPhaseName} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold disabled:opacity-50 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suppression Phase */}
      {phaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-red-500/30">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Supprimer la phase ?</h3>
              <div className="text-sm text-slate-300 space-y-2">
                <p>Êtes-vous sûr de vouloir supprimer la phase <strong className="text-white">"{phaseToDelete.name}"</strong> ?</p>
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-left text-xs">
                  <p className="font-bold mb-1">Attention, cette action cascade :</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>Détruira la phase de l'interface</li>
                    <li><strong>Supprimera définitivement tous les matchs</strong> qui y sont rattachés</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 p-4 bg-slate-900/50">
              <button 
                onClick={() => setPhaseToDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={deletePhase}
                className="flex-1 px-4 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}