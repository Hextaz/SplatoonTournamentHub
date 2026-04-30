"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trophy, AlertTriangle, Loader2, Trash2, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  description: z.string().optional(),
  start_at: z.string().min(1, "La date de début est requise"),
  checkin_start_at: z.string().min(1, "La date de début du check-in est requise"),
  checkin_end_at: z.string().min(1, "La date de fin du check-in est requise"),
}).refine((data) => new Date(data.checkin_end_at) > new Date(data.checkin_start_at), {
  message: "La fin du check-in doit être après le début",
  path: ["checkin_end_at"],
}).refine((data) => new Date(data.start_at) > new Date(data.checkin_end_at), {
  message: "Le tournoi doit commencer après la fin du check-in",
  path: ["start_at"],
});

type FormValues = z.infer<typeof formSchema>;

export default function TournamentsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const router = useRouter();
  const { guildId } = use(params);
  
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:8080";

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const fetchTournaments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("guild_id", guildId)
      .order("created_at", { ascending: false });

    setTournaments(data || []);
    setLoading(false);
  };

  const hasActiveTournament = tournaments.some(t => ['REGISTRATION', 'ACTIVE', 'DRAFT'].includes(t.status));

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le tournoi "${name}" ? Cette action est irréversible.`)) return;
    try {
      setLoading(true);
      await supabase.from("tournaments").delete().eq("id", id);
      await fetchTournaments();
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la suppression.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [guildId]);

  const onSubmit = async (data: FormValues) => {
    setCreating(true);

    try {
      // 1. Récupérer les paramètres par défaut du serveur
      const { data: serverSettings } = await supabase
        .from("server_settings")
        .select("*")
        .eq("guild_id", guildId)
        .single();

      // 2. Créer le tournoi avec ou sans paramètres par défaut
      const { data: created, error } = await supabase
        .from("tournaments")
        .insert({
          guild_id: guildId,
          name: data.name,
          description: data.description,
          status: "REGISTRATION",
          start_at: new Date(data.start_at).toISOString(),
          checkin_start_at: new Date(data.checkin_start_at).toISOString(),
          checkin_end_at: new Date(data.checkin_end_at).toISOString(),
          discord_registration_channel_id: serverSettings?.registration_channel_id || null,
          discord_announcement_channel_id: serverSettings?.announcement_channel_id || null,
          discord_checkin_channel_id: serverSettings?.checkin_channel_id || null,
          discord_captain_role_id: serverSettings?.captain_role_id || null,
          discord_to_role_id: serverSettings?.to_role_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      try {
        await fetch(`/api/bot/tournaments/archive-and-init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guildId,
            newTournamentId: created.id
          })
        });
      } catch (botErr) {
        console.warn("Express Bot unavailable, roles/channels not initialized on Discord side.");
      }

      setShowCreateModal(false);
      reset();
      fetchTournaments();
      
      router.push(`/admin/${guildId}/tournaments/${created.id}`);

    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création du tournoi.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">🏆 Gestion des Tournois</h1>
          <p className="text-slate-400">Gérez le tournoi en cours et lancez de nouvelles éditions.</p>
        </div>
        <button 
          onClick={() => !hasActiveTournament && setShowCreateModal(true)}
          disabled={hasActiveTournament}
          title={hasActiveTournament ? "Un tournoi est déjà actif" : ""}
          className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
            hasActiveTournament 
              ? "bg-slate-700/50 text-slate-500 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-500 text-white"
          }`}
        >
          <Plus className="w-5 h-5" />
          Créer un Tournoi
        </button>
      </div>

      {hasActiveTournament && !loading && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4 flex gap-4 items-center text-yellow-500">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <p>
            <strong>Bloqué :</strong> Un tournoi est déjà en cours de configuration ou actif. Vous devez le terminer (clôturer) ou le supprimer avant d'en créer un nouveau afin de prévenir les conflits de salons Discord.
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : tournaments && tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="bg-slate-800 p-6 border-b border-slate-700">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col items-start gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      tournament.status === 'ACTIVE' || tournament.status === 'REGISTRATION' ? 'bg-green-500/20 text-green-400' :
                      tournament.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                      tournament.status === 'ARCHIVED' ? 'bg-slate-500/20 text-slate-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {tournament.status}
                    </span>
                    <h2 className="text-2xl font-bold text-white leading-tight">{tournament.name}</h2>
                  </div>
                  <button 
                    onClick={() => handleDelete(tournament.id, tournament.name)}
                    title="Supprimer"
                    className="p-2 ml-4 bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                {tournament.description && (
                  <p className="text-slate-400 mb-4 line-clamp-2">{tournament.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <span>ID: {tournament.id.split('-')[0]}...</span>
                  <span>📅 {new Date(tournament.start_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-900/50">
                <button 
                  onClick={() => router.push(`/admin/${guildId}/tournaments/${tournament.id}`)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
                >
                  <Settings className="w-5 h-5" /> Salle des Machines
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-slate-700/50 border-dashed rounded-2xl p-12 text-center">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-300 mb-2">Aucun tournoi n'est actif</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Votre serveur est en sommeil. Créez un nouveau tournoi pour démarrer les inscriptions et le setup des salons Discord.
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus className="w-5 h-5" />
            Créer un nouveau Tournoi
          </button>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Nouvelle Édition</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nom du Tournoi <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  {...register("name")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500"
                  placeholder="Ex: Splatoon Cup Series #4"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optionnelle)</label>
                <textarea 
                  {...register("description")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500 h-24 resize-none"
                  placeholder="Règles ou sous-titre de l'évènement..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Début du Check-in <span className="text-red-500">*</span></label>
                <input 
                  type="datetime-local" 
                  {...register("checkin_start_at")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500"
                />
                {errors.checkin_start_at && <p className="text-red-400 text-xs mt-1">{errors.checkin_start_at.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Fin du Check-in <span className="text-red-500">*</span></label>
                <input 
                  type="datetime-local" 
                  {...register("checkin_end_at")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500"
                />
                {errors.checkin_end_at && <p className="text-red-400 text-xs mt-1">{errors.checkin_end_at.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Début du Tournoi <span className="text-red-500">*</span></label>
                <input 
                  type="datetime-local" 
                  {...register("start_at")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500"
                />
                {errors.start_at && <p className="text-red-400 text-xs mt-1">{errors.start_at.message}</p>}
              </div>

              <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 flex gap-3 text-sm text-yellow-500 my-4">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>La création déclenchera le Bot Discord qui archivera les anciens salons et créera la nouvelle infrastructure.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-medium transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:text-white/50 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                >
                  {creating ? <><Loader2 className="w-5 h-5 animate-spin" /> Création...</> : "🚀 Lancer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
