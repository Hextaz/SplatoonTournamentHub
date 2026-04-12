import { supabase } from "@/lib/supabase";
import MatchesTabs from "./MatchesTabs";

export default async function MatchesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string; id: string }>;
}) {
  const { guildId, id: tournamentId } = await params;

  // Fetch all phases for this tournament to generate the tabs
  const { data: phases } = await supabase
    .from("phases")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("phase_order", { ascending: true });

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-[calc(100vh-2rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Matchs & Arbitrage</h1>
        <p className="text-slate-400">Gérez l&apos;ensemble des rencontres, forcez les résultats et observez l&apos;avancée du tournoi.</p>
      </div>

      <MatchesTabs guildId={guildId} tournamentId={tournamentId} phases={phases || []} />

      <div className="pt-4">
        {children}
      </div>
    </div>
  );
}
