"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trophy, Archive, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TournamentsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const router = useRouter();
  const { guildId } = use(params);
  
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newTourneyName, setNewTourneyName] = useState("");
  const [newTourneyDesc, setNewTourneyDesc] = useState("");

  const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:3001";

  // Fetch active tournament
  const fetchActive = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("guild_id", guildId)
      .in("status", ["REGISTRATION", "ACTIVE"])
      .maybeSingle();

    setActiveTournament(data || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchActive();
  }, [guildId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Create tournament DB entry
      const { data: created, error } = await supabase
        .from("tournaments")
        .insert({
          guild_id: guildId,
          name: newTourneyName,
          description: newTourneyDesc,
          status: "REGISTRATION",
          start_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Contact Express Bot to setup channels or archive old ones
      try {
        await fetch(`${BOT_API_URL}/api/archive-and-init`, {
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
      setNewTourneyName("");
      setNewTourneyDesc("");
      fetchActive();
      
      // Also we could redirect to a specific tournament manage page:
      // router.push(`/admin/${guildId}/tournaments/${created.id}`);

    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création.");
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
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shrink-0"
        >
          <Plus className="w-5 h-5" />
          Nouveau Tournoi
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : activeTournament ? (
        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-blue-500/30 p-8 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-blue-500/20 text-blue-300 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-widest border border-blue-500/30">
              Actif
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            {activeTournament.name}
          </h2>
          <p className="text-slate-300 mb-6 max-w-2xl">{activeTournament.description}</p>

          <div className="flex flex-wrap gap-4">
            <button className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg font-bold border border-slate-700 transition flex items-center">
              Gestion du Bracket
            </button>
            <button className="text-red-400 hover:bg-red-500/10 px-5 py-2.5 rounded-lg font-bold border border-transparent transition flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Archiver manuellement
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-2xl p-12 text-center flex flex-col items-center">
          <Trophy className="w-16 h-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-300 mb-2">Aucun tournoi actif</h3>
          <p className="text-slate-400 mb-6">Créez un nouveau tournoi pour ouvrir les inscriptions.</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
          >
            Créer un tournoi
          </button>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Plus className="text-blue-400" /> Initialiser un Tournoi
              </h3>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              
              {activeTournament && (
                <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 flex gap-3 text-yellow-300 text-sm">
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-yellow-500" />
                  <p>
                    <strong className="block text-yellow-500 mb-1">Attention ! Un tournoi est déjà en cours.</strong>
                    Créer ce nouveau tournoi va <strong>archiver</strong> "{activeTournament.name}" et passer ses salons Discord existants en lecture seule (via le bot).
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nom du Tournoi <span className="text-red-400">*</span></label>
                  <input 
                    required 
                    type="text" 
                    value={newTourneyName}
                    onChange={(e) => setNewTourneyName(e.target.value)}
                    placeholder="Inkling Cup Saison 4" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optionnel)</label>
                  <textarea 
                    value={newTourneyDesc}
                    onChange={(e) => setNewTourneyDesc(e.target.value)}
                    placeholder="Règles, cashprize, mots doux..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white h-24 focus:border-blue-500 focus:outline-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-700">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={creating || !newTourneyName}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex justify-center items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? "Veuillez patienter..." : "Confirmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
