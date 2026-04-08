import { supabase } from "@/lib/supabase";
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
        await fetch("http://localhost:8080/api/discord/sync-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournament_id: savedId }),
        });
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
    <div className="min-h-screen p-8 bg-gray-50 flex items-start justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
          Gestion des Tournois
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: FORM (Création ou update du dernier) */}
          <div className="bg-gray-50 border p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Créer / Modifier un tournoi</h2>
            <form action={saveTournament} className="flex flex-col gap-4">
              {/* Fake hidden ID field just to allow updates if we wanted standard edit. 
                  We'll leave id blank by default to create a new one, or can pre-fill. */}
              <input type="hidden" name="id" value="" />
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  Nom du Tournoi
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="Ex: Splatoon Summer Cup"
                  className="p-3 border border-gray-300 rounded-lg text-gray-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  Début du Check-in (Ouverture du bouton)
                </label>
                <input
                  name="checkinStartAt"
                  type="datetime-local"
                  className="p-3 border border-gray-300 rounded-lg text-gray-800"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  Fin du Check-in (Fermeture du bouton)
                </label>
                <input
                  name="checkinEndAt"
                  type="datetime-local"
                  className="p-3 border border-gray-300 rounded-lg text-gray-800"
                  required
                />
              </div>

              <button
                type="submit"
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg"
              >
                Sauvegarder & Programmer le Bot
              </button>
            </form>
          </div>

          {/* RIGHT: LIST */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Tournois configurés</h2>
            <div className="flex flex-col gap-3">
              {tournaments?.map((t: any) => (
                <div key={t.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col gap-1">
                  <span className="font-bold text-gray-800">{t.name}</span>
                  <span className="text-sm text-gray-500">ID: {t.id}</span>
                  <div className="text-sm text-gray-600 mt-2 grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-green-600">Début Check-in:</span>
                      <span>{t.checkin_start_at ? new Date(t.checkin_start_at).toLocaleString() : 'Non défini'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-red-600">Fin Check-in:</span>
                      <span>{t.checkin_end_at ? new Date(t.checkin_end_at).toLocaleString() : 'Non défini'}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t w-full">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded-lg flex justify-center transition-colors shadow-sm"
                    >
                      ⚙️ Gérer ce tournoi
                    </Link>
                  </div>
                </div>
              ))}
              {(!tournaments || tournaments.length === 0) && (
                <p className="text-gray-500 italic">Aucun tournoi trouvé.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}