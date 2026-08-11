"use client";

import { useEffect, useState, use } from "react";
import { botApiFetch } from '@/utils/api';
import { supabase } from "@/lib/supabase";
import { Save, Loader2, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/i18n/LanguageContext";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const unwrappedParams = use(params);
  const { guildId } = unwrappedParams;
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [settings, setSettings] = useState({
    captain_role_id: "",
    to_role_id: "",
    checkin_channel_id: "",
    announcement_channel_id: "",
    registration_channel_id: "",
  });

  const [discordRoles, setDiscordRoles] = useState<{ id: string; name: string }[]>([]);
  const [discordChannels, setDiscordChannels] = useState<{ id: string; name: string }[]>([]);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    async function loadData() {
      if (status === "loading") return;

      setLoading(true);
      try {
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
            announcement_channel_id: dbSettings.announcement_channel_id || "",
            registration_channel_id: dbSettings.registration_channel_id || "",
          });
        }

        try {
          const rolesRes = await fetch(`/api/bot/discord/roles?guildId=${guildId}`);
          if (rolesRes.ok) {
            const roles = await rolesRes.json();
            setDiscordRoles(roles);
          }
        } catch (e) {
          setApiError(t("adminSettings.botError"));
        }

        try {
          const channelsRes = await fetch(`/api/bot/discord/channels?guildId=${guildId}`);
          if (channelsRes.ok) {
            const channels = await channelsRes.json();
            setDiscordChannels(channels);
          }
        } catch (e) {}

      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    loadData();
  }, [guildId, session, status, t]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await botApiFetch(`/api/server-settings?guildId=${guildId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId,
          guild_id: guildId,
          captain_role_id: settings.captain_role_id,
          to_role_id: settings.to_role_id,
          checkin_channel_id: settings.checkin_channel_id,
          announcement_channel_id: settings.announcement_channel_id,
          registration_channel_id: settings.registration_channel_id,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur inconnue');
      }

      setMessage({ type: "success", text: t("adminSettings.savedSuccess") });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: t("adminSettings.saveError") + err.message });
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
        <span className="ml-4">{t("adminSettings.loading")}</span>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{t("adminSettings.title")}</h1>
        <p className="text-slate-400">{t("adminSettings.subtitle")}</p>

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
          <h2 className="text-xl font-semibold text-slate-200 border-b border-slate-700 pb-2">{t("adminSettings.rolesSection")}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">{t("adminSettings.captainRole")}</label>
              {discordRoles.length > 0 ? (
                <select
                  name="captain_role_id"
                  value={settings.captain_role_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">{t("adminSettings.selectRole")}</option>
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
                  placeholder={t("adminSettings.roleIdPlaceholder")}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">{t("adminSettings.toRole")}</label>
              {discordRoles.length > 0 ? (
                <select
                  name="to_role_id"
                  value={settings.to_role_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">{t("adminSettings.selectRole")}</option>
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
                  placeholder={t("adminSettings.roleIdPlaceholder")}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                />
              )}
            </div>
          </div>
        </div>

        {/* SALONS */}
        <div className="space-y-6 pt-4">
          <h2 className="text-xl font-semibold text-slate-200 border-b border-slate-700 pb-2">{t("adminSettings.channelsSection")}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">{t("adminSettings.checkinChannel")}</label>
              {discordChannels.length > 0 ? (
                <select
                  name="checkin_channel_id"
                  value={settings.checkin_channel_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">{t("adminSettings.selectChannel")}</option>
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
                  placeholder={t("adminSettings.channelIdPlaceholder")}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-400">{t("adminSettings.announcementChannel")}</label>
              {discordChannels.length > 0 ? (
                <select
                  name="announcement_channel_id"
                  value={settings.announcement_channel_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">{t("adminSettings.selectChannel")}</option>
                  {discordChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="announcement_channel_id"
                  value={settings.announcement_channel_id}
                  onChange={handleChange}
                  placeholder={t("adminSettings.channelIdPlaceholder")}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white"
                />
              )}
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-400">{t("adminSettings.registrationChannel")}</label>
              {discordChannels.length > 0 ? (
                <select
                  name="registration_channel_id"
                  value={settings.registration_channel_id}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">{t("adminSettings.selectRegistrationChannel")}</option>
                  {discordChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="registration_channel_id"
                  value={settings.registration_channel_id}
                  onChange={handleChange}
                  placeholder={t("adminSettings.channelIdPlaceholder")}
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
            {saving ? t("adminSettings.saving") : t("adminSettings.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
