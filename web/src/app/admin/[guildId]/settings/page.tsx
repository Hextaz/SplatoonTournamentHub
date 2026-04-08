"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { Save, Loader2, RefreshCw } from "lucide-react";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const unwrappedParams = use(params);
  const { guildId } = unwrappedParams;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [settings, setSettings] = useState({
    captain_role_id: "",
    to_role_id: "",
    checkin_channel_id: "",
    announcements_channel_id: "",
  });

  const [discordRoles, setDiscordRoles] = useState<{ id: string; name: string }[]>([]);
  const [discordChannels, setDiscordChannels] = useState<{ id: string; name: string }[]>([]);
  const [apiError, setApiError] = useState("");

  const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || "http://localhost:3001";

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch Supabase settings
        const { data: dbSettings, error: dbError } = await supabase
          .from("server_settings")
          .select("*")
          .eq("guild_id", guildId)
          .single();

        if (dbSettings && !dbError) {
          setSettings({
            captain_role_id: dbSettings.captain_role_id || "",
            to_role_id: dbSettings.to_role_id || "",
            checkin_channel_id: dbSettings.checkin_channel_id || "",
            announcements_channel_id: dbSettings.announcements_channel_id || "",
          });
        }

        // Fetch Discord Roles via Express Bot API
        try {
          const rolesRes = await fetch(`${BOT_API_URL}/api/discord/roles/${guildId}`);
          if (rolesRes.ok) {
            const roles = await rolesRes.json();
            setDiscordRoles(roles);
          }
        } catch (e) {
          setApiError("Impossible de joindre le Bot pour les rôles/salons. Vous devez renseigner les IDs manuellement.");
        }

        // Fetch Discord Channels via Express Bot API
        try {
          const channelsRes = await fetch(`${BOT_API_URL}/api/discord/channels/${guildId}`);
          if (channelsRes.ok) {
            const channels = await channelsRes.json();
            // Filter out voice channels if needed, but here we take everything returned by bot
            setDiscordChannels(channels);
          }
        } catch (e) {}

      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadData();
  }, [guildId, BOT_API_URL]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = {
        guild_id: guildId,
        captain_role_id: settings.captain_role_id,
        to_role_id: settings.to_role_id,
        checkin_channel_id: settings.checkin_channel_id,
        announcements_channel_id: settings.announcements_channel_id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("server_settings")
        .upsert(payload, { onConflict: "guild_id" });

      if (error) throw error;
      setMessage({ type: "success", text: "Paramètres sauvegardés avec succès !" });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde : " + err.message });
    }
    setSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-4">Chargement des paramètres...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">⚙️ Paramètres du Serveur</h1>
        <p className="text-slate-400">Configurez les rôles clés et les salons de votre serveur Discord.</p>
        
        {apiError && (
          <div className="mt-4 bg-yellow-900/30 border border-yellow-700/50 p-4 rounded-xl text-yellow-400 text-sm flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            {apiError}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-6">
        {/* RÔLES */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-200 border-b border-slate-700 pb-2">Rôles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">Rôle Capitaine</label>
              {discordRoles.length > 0 ? (
                <select
                  name="captain_role_id"
                  value={settings.captain_role_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Sélectionner un rôle</option>
                  {discordRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  name="captain_role_id"
                  value={settings.captain_role_id}
                  onChange={handleChange}
                  placeholder="ID du Rôle" 
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">Rôle T.O (Tournament Organizer)</label>
              {discordRoles.length > 0 ? (
                <select
                  name="to_role_id"
                  value={settings.to_role_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Sélectionner un rôle</option>
                  {discordRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  name="to_role_id"
                  value={settings.to_role_id}
                  onChange={handleChange}
                  placeholder="ID du Rôle" 
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                />
              )}
            </div>
          </div>
        </div>

        {/* SALONS */}
        <div className="space-y-6 pt-4">
          <h2 className="text-xl font-semibold text-slate-200 border-b border-slate-700 pb-2">Salons</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">Salon de Check-in</label>
              {discordChannels.length > 0 ? (
                <select
                  name="checkin_channel_id"
                  value={settings.checkin_channel_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Sélectionner un salon textuel</option>
                  {discordChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  name="checkin_channel_id"
                  value={settings.checkin_channel_id}
                  onChange={handleChange}
                  placeholder="ID du Salon" 
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">Salon d'Annonces (Public)</label>
              {discordChannels.length > 0 ? (
                <select
                  name="announcements_channel_id"
                  value={settings.announcements_channel_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Sélectionner un salon textuel</option>
                  {discordChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              ) : (
                <input 
                  type="text" 
                  name="announcements_channel_id"
                  value={settings.announcements_channel_id}
                  onChange={handleChange}
                  placeholder="ID du Salon" 
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                />
              )}
            </div>
          </div>
        </div>

        {/* MESSAGES & VALIDATION */}
        {message.text && (
          <div className={`p-4 rounded-lg flex items-center ${
            message.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-500 border border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="pt-6 flex justify-end">
          <button 
            type="submit" 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </form>
    </div>
  );
}
