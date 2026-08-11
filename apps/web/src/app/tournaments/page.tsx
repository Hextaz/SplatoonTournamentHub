import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { cookies } from "next/headers";
import { t } from "@/i18n";
import { Locale } from "@/i18n/types";

export default async function TournamentsPage() {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID || "";
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) || "fr";

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

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] p-8 bg-[#0a0a0f] text-slate-200 flex items-start justify-center">
      <div className="bg-[#151722] p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-[1600px] w-full mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6 border-b border-slate-800 pb-4">
          {t(locale, "tournamentsPage.title")}
        </h1>
 
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: FORM */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-slate-300">
              {t(locale, "tournamentsPage.createOrEdit")}
            </h2>
            <form action={saveTournament} className="flex flex-col gap-4">
              <input type="hidden" name="id" value="" />
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">
                  {t(locale, "tournamentsPage.nameLabel")}
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder={t(locale, "tournamentsPage.namePlaceholder")}
                  className="p-3 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
 
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300">
                  {t(locale, "tournamentsPage.checkinStartLabel")}
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
                  {t(locale, "tournamentsPage.checkinEndLabel")}
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
                {t(locale, "tournamentsPage.saveButton")}
              </button>
            </form>
          </div>
 
          {/* RIGHT: LIST */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-slate-300">
              {t(locale, "tournamentsPage.configuredTitle")}
            </h2>
            <div className="flex flex-col gap-3">
              {tournaments?.map((tourn: any) => (
                <div key={tourn.id} className="p-4 border border-slate-800 rounded-lg bg-[#1a1d2d] shadow-sm flex flex-col gap-1">
                  <span className="font-bold text-white">{tourn.name}</span>
                  <span className="text-sm text-slate-400">ID: {tourn.id}</span>
                  <div className="text-sm text-slate-300 mt-2 grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-emerald-400">{t(locale, "tournamentsPage.checkinStart")}</span>
                      <span>{tourn.checkin_start_at ? new Date(tourn.checkin_start_at).toLocaleString() : t(locale, "tournamentsPage.notDefined")}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-rose-400">{t(locale, "tournamentsPage.checkinEnd")}</span>
                      <span>{tourn.checkin_end_at ? new Date(tourn.checkin_end_at).toLocaleString() : t(locale, "tournamentsPage.notDefined")}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800 w-full">
                    <Link
                      href={`/tournaments/${tourn.id}`}
                      className="w-full bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 font-semibold py-2 px-4 rounded-lg flex justify-center transition-colors shadow-sm"
                    >
                      {t(locale, "tournamentsPage.manage")}
                    </Link>
                  </div>
                </div>
              ))}
              {(!tournaments || tournaments.length === 0) && (
                <p className="text-slate-400 italic">{t(locale, "tournamentsPage.noTournaments")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
