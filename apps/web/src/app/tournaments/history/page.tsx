"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function TournamentsHistoryPage() {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "";
  const { toast } = useToast();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournamentToDelete, setTournamentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .eq("guild_id", guildId)
      .in("status", ["ARCHIVED", "COMPLETED"])
      .order("created_at", { ascending: false });
    
    setHistory(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [guildId]);

  const deleteTournament = async () => {
    if (!tournamentToDelete) return;
    try {
      setDeleting(true);
      const { error } = await supabase.from("tournaments").delete().eq("id", tournamentToDelete.id);
      if (error) throw error;
      setHistory(history.filter(t => t.id !== tournamentToDelete.id));
      setTournamentToDelete(null);
      toast.success("Tournoi supprimé définitivement de la base de données.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Historique des Tournois</h1>
          <Link href="/tournaments" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-medium">
            ← Retour au Hub
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-gray-500 animate-pulse">Chargement de l'historique...</p>
          ) : history.length === 0 ? (
            <p className="p-8 text-center text-gray-500">Aucun tournoi archivé ou terminé trouvé.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-700 text-sm">
                  <th className="p-4 font-semibold">Nom</th>
                  <th className="p-4 font-semibold">Créé le</th>
                  <th className="p-4 font-semibold text-center">Statut</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{t.name}</td>
                    <td className="p-4 text-gray-600 text-sm">{new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setTournamentToDelete(t)}
                        className="text-sm text-red-600 hover:text-red-900 font-medium px-3 py-1 border border-red-200 hover:bg-red-50 rounded transition cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Suppression Tournoi Archivé */}
      <ConfirmModal
        isOpen={!!tournamentToDelete}
        onClose={() => setTournamentToDelete(null)}
        onConfirm={deleteTournament}
        title="Supprimer définitivement"
        description={
          tournamentToDelete ? (
            <span>
              Attention : La suppression de <strong className="text-white">"{tournamentToDelete.name}"</strong> effacera définitivement ce tournoi et ses matchs associés de la base de données.
            </span>
          ) : ""
        }
        confirmText="Supprimer définitivement"
        variant="danger"
        icon={Trash2}
        isLoading={deleting}
      />
    </div>
  );
}

