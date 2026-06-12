import { supabase } from "@/lib/supabase";
import { getBotApiUrl } from '@/utils/api';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function TournamentsPage() {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "";

  // 1. Charger les tournois de ce serveur
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false });

  // 2. Action Server : Créer ou mettre à jour un tournoi
  async function saveTournament(formData: FormData) {
    "use server";
    const serverGuildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "";
    
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const startAtStr = formData.get("checkinStartAt") as string;
    const endAtStr = formData.get("checkinEndAt") as string;

    const startAt = startAtStr ? new Date(startAtStr).toISOString() : null;
    const endAt = endAtStr ? new Date(endAtStr).toISOString() : null;

    let savedId = id;

    if (id) {
      // Update
      await supabase
        .from("tournaments")
        .update({
          name,
          checkin_start_at: startAt,
          checkin_end_at: endAt,
        })
        .eq("id", id);
    } else {
      // Create
      const { data: newRow } = await supabase
        .from("tournaments")
        .insert({
          guild_id: serverGuildId,
          name,
          checkin_start_at: startAt,
          checkin_end_at: endAt,
        })
        .select()
        .single();
      if (newRow) savedId = newRow.id;
    }

    // 3. Prévenir le Scheduler du Bot
    if (savedId) {
      try {
        const actionSession = await getServerSession(authOptions);
        const actionDiscordId = (actionSession?.user as any)?.id || "";
        const actionBotApiSecret = process.env.BOT_API_SECRET;
        const botApiUrl = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:8080";

        if (actionBotApiSecret) {
          await fetch(`${botApiUrl}/api/discord/sync-schedule?guildId=${serverGuildId}`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${actionBotApiSecret}`,
              "X-Discord-User-Id": actionDiscordId,
              "X-Guild-Id": serverGuildId,
            },
            body: JSON.stringify({ tournament_id: savedId }),
          });
        }
      } catch (e) {
        console.error("Bot is offline or unreachable", e);
      }
    }

    revalidatePath("/tournaments");
  }

  // Pour simplifier l'UI d'édition, les dates requièrent le format adaptatif ("yyyy-MM-ddThh:mm")
  const formatForInput = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    // On enlève la Z timezone et on triche un peu sur l'affichage local vs utc, mais pour l'exemple c'est OK
    return d.toISOString().slice(0, 16); 
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-8 bg-[#0a0a0f] text-slate-200 flex items-start justify-center">
      <div className="bg-[#151722] p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-[1600px] w-full mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
          Gestion des Tournois
        </h1>
 
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: FORM (Création ou update du dernier) */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-300">Créer / Modifier un tournoi</h2>
            <form action={saveTournament} className="flex flex-col gap-4">
              {/* Fake hidden ID field just to allow updates if we wanted standard edit. 
                  We'll leave id blank by default to create a new one, or can pre-fill. */}
              <input type="hidden" name="id" value="" />
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">
                  Nom du Tournoi
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Ex: Splatoon Summer Cup"
                  className="p-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
 
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">
                  Début du Check-in (Ouverture du bouton)
                </label>
                <input
                  name="checkinStartAt"
                  type="datetime-local"
                  className="p-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
 
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">
                  Fin du Check-in (Fermeture du bouton)
                </label>
                <input
                  name="checkinEndAt"
                  type="datetime-local"
                  className="p-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
 
              <button
                type="submit"
                className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Sauvegarder & Programmer le Bot
              </button>
            </form>
          </div>
 
          {/* RIGHT: LIST */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-slate-300">Tournois configurés</h2>
            <div className="flex flex-col gap-3">
              {tournaments?.map((t: any) => (
                <div key={t.id} className="p-4 border border-slate-800 rounded-lg bg-[#1a1d2d] shadow-sm flex flex-col gap-1">
                  <span className="font-bold text-white">{t.name}</span>
                  <span className="text-sm text-slate-400">ID: {t.id}</span>
                  <div className="text-sm text-slate-300 mt-2 grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-400">Début Check-in:</span>
                      <span>{t.checkin_start_at ? new Date(t.checkin_start_at).toLocaleString() : 'Non défini'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-rose-400">Fin Check-in:</span>
                      <span>{t.checkin_end_at ? new Date(t.checkin_end_at).toLocaleString() : 'Non défini'}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800 w-full">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="w-full bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 font-semibold py-2 px-4 rounded-lg flex justify-center transition-colors shadow-sm"
                    >
                      ⚙️ Gérer ce tournoi
                    </Link>
                  </div>
                </div>
              ))}
              {(!tournaments || tournaments.length === 0) && (
                <p className="text-slate-400 italic">Aucun tournoi trouvé.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
