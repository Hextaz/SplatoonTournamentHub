"use client";

import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { botApiFetch, getBotApiUrl } from '@/utils/api';

import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";
import { Save, CalendarDays, RefreshCw, MessageSquare, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function SettingsClient({ tournament, guildId, initialChannels = [], initialRoles = [] }: { tournament: any; guildId: string; initialChannels?: any[]; initialRoles?: any[] }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const [channels, setChannels] = useState<any[]>(initialChannels);
  const [roles, setRoles] = useState<any[]>(initialRoles);
  const [isLoadingDiscord, setIsLoadingDiscord] = useState(true);
  const [discordError, setDiscordError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiscordData = async () => {
      // Don't try fetching if we're still checking auth status and we don't have a token.
      if (status === 'loading') return;
      
      if (!guildId) {
        setIsLoadingDiscord(false);
        return;
      }
      try {
        // Calling our proxy Next.js API routes that use BOT_API_SECRET instead of the user's JWT token
        // This solves the JWT "Invalid or expired token" errors when talking directly to the bot.
        const [channelsRes, rolesRes] = await Promise.all([
          fetch(`/api/bot/discord/channels?guildId=${guildId}`),
          fetch(`/api/bot/discord/roles?guildId=${guildId}`)
        ]);

        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          setChannels(channelsData);
        } else {
          const errText = await channelsRes.text();
          console.error("Failed to fetch Discord channels:", errText);
          setDiscordError("Impossible de charger les salons Discord. Vérifiez que le bot est bien connecté et que la variable d'environnement BOT_API_SECRET est configurée.");
        }

        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData);
        } else {
          const errText = await rolesRes.text();
          console.error("Failed to fetch Discord roles:", errText);
          setDiscordError("Impossible de charger les rôles Discord.");
        }
      } catch (e) {
        console.error("Failed to fetch Discord data", e);
        setDiscordError("Erreur lors du chargement des données Discord.");
      } finally {
        setIsLoadingDiscord(false);
      }
    };

    fetchDiscordData();
  }, [guildId, session, status]);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      start_at: tournament.start_at ? dayjs(tournament.start_at).format('YYYY-MM-DDTHH:mm') : "",
      checkin_start_at: tournament.checkin_start_at ? dayjs(tournament.checkin_start_at).format('YYYY-MM-DDTHH:mm') : "",
      checkin_end_at: tournament.checkin_end_at ? dayjs(tournament.checkin_end_at).format('YYYY-MM-DDTHH:mm') : "",
      discord_registration_channel_id: tournament.discord_registration_channel_id || "",
      discord_announcement_channel_id: tournament.discord_announcement_channel_id || "",
      discord_checkin_channel_id: tournament.discord_checkin_channel_id || "",
      discord_captain_role_id: tournament.discord_captain_role_id || "",
      discord_to_role_id: tournament.discord_to_role_id || ""
    }
  });

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setMessage(null);

    const payload = {
      start_at: data.start_at ? new Date(data.start_at).toISOString() : null,
      checkin_start_at: data.checkin_start_at ? new Date(data.checkin_start_at).toISOString() : null,
      checkin_end_at: data.checkin_end_at ? new Date(data.checkin_end_at).toISOString() : null,
      discord_registration_channel_id: data.discord_registration_channel_id || null,
      discord_announcement_channel_id: data.discord_announcement_channel_id || null,
      discord_checkin_channel_id: data.discord_checkin_channel_id || null,
      discord_captain_role_id: data.discord_captain_role_id || null,
      discord_to_role_id: data.discord_to_role_id || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('tournaments')
      .update(payload)
      .eq('id', tournament.id);

    setIsSaving(false);

    if (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde : ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès !' });
      router.refresh();
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-400" />
            Paramètres du Tournoi
          </h1>
          <p className="text-slate-400">Configurez les dates de ce tournoi et les paramètres Discord.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg font-medium border ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
          {message.text}
        </div>
      )}

      {discordError && (
        <div className="p-4 rounded-lg font-medium border bg-amber-500/20 text-amber-400 border-amber-500/50">
          ⚠️ {discordError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 rounded-xl p-8 border border-slate-700 space-y-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4">Dates & Horaires</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 md:col-span-2">
            <label className="block text-sm font-semibold text-slate-300">Date de début du tournoi</label>
            <input 
              type="datetime-local" 
              {...register("start_at")} 
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">Début des check-ins</label>
            <input 
              type="datetime-local" 
              {...register("checkin_start_at")} 
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">Fin des check-ins</label>
            <input 
              type="datetime-local" 
              {...register("checkin_end_at")} 
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-4 mt-8 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          Salons Discord
        </h2>

        {isLoadingDiscord ? (
          <div className="text-slate-400 text-sm animate-pulse">Chargement des salons et rôles depuis Discord...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300">Salon des inscriptions</label>
              <select
                {...register("discord_registration_channel_id")}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              >
                <option value="">-- Aucun salon --</option>
                {channels.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300">Salon des annonces</label>
              <select
                {...register("discord_announcement_channel_id")}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              >
                <option value="">-- Aucun salon --</option>
                {channels.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300">Salon des check-ins</label>
              <select
                {...register("discord_checkin_channel_id")}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              >
                <option value="">-- Aucun salon --</option>
                {channels.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-white mb-4 mt-8 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Rôles Discord
        </h2>

        {!isLoadingDiscord && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300">Rôle Capitaine / Participant</label>
              <select
                {...register("discord_captain_role_id")}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
              >
                <option value="">-- Aucun rôle --</option>
                {roles.map((ro: any) => (
                  <option key={ro.id} value={ro.id}>@{ro.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300">Rôle TO (Organisateur)</label>
              <select
                {...register("discord_to_role_id")}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
              >
                <option value="">-- Aucun rôle --</option>
                {roles.map((ro: any) => (
                  <option key={ro.id} value={ro.id}>@{ro.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-slate-700/80 flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Enregistrer les paramètres
          </button>
        </div>
      </form>
    </div>
  );
}
