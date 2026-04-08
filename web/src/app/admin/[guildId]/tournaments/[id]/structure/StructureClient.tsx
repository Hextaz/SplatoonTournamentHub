"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyX, GitMerge, LayoutGrid, Network, Trash2, CheckCircle2, HelpCircle } from "lucide-react";
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

  const deletePhase = async (phaseId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette phase ?")) return;
    try {
      const { error } = await supabase.from('phases').delete().eq('id', phaseId).eq('status', 'draft');
      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
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
                  
                  {phase.status === 'draft' && (
                    <button 
                      onClick={() => deletePhase(phase.id)}
                      className="p-2 text-slate-400 hover:text-red-400 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Supprimer la phase"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
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
    </div>
  );
}