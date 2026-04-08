import { supabase } from "@/lib/supabase";
import { PhaseManager } from "@/components/PhaseManager";
import Link from "next/link";
import { notFound } from "next/navigation";

interface TournamentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TournamentDetailPage(props: TournamentPageProps) {
  const params = await props.params;
  const tournamentId = params.id;

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (error || !tournament) {
    notFound();
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/tournaments" className="text-blue-600 hover:underline font-medium">
            ← Retour à la liste
          </Link>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <span>🏆</span> {tournament.name}
          </h1>
          <p className="text-gray-500 mt-2 font-mono text-sm">ID: {tournament.id}</p>
          
          <div className="mt-6 flex flex-wrap gap-6 border-t pt-6 bg-gray-50 -mx-8 px-8 pb-4 rounded-b-xl border">
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase">Début du Check-in</span>
              <span className="font-medium text-gray-800">
                {tournament.checkin_start_at ? new Date(tournament.checkin_start_at).toLocaleString() : "Non défini"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase">Fin du Check-in</span>
              <span className="font-medium text-gray-800">
                {tournament.checkin_end_at ? new Date(tournament.checkin_end_at).toLocaleString() : "Non défini"}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase">Serveur (Guild ID)</span>
              <span className="font-medium text-gray-800">
                {tournament.guild_id}
              </span>
            </div>
          </div>
        </div>

        {/* C'est ici que l'on intègre ton super PhaseManager (Drag & Drop) ! */}
        {/* <PhaseManager tournamentId={tournament.id} /> */}
      </div>
    </div>
  );
}
